<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\VipActivatedMail;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class VipTransactionController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status');

        $query = Transaction::with('user')->latest();

        if ($status === 'pending') {
            $query->whereIn('status', ['pending', 'waiting_admin']);
        } elseif (in_array($status, ['completed', 'cancelled'])) {
            $query->where('status', $status);
        }

        $transactions = $query->paginate(20);

        return view('admin.vip-transactions.index', compact('transactions'));
    }

    public function confirm(Transaction $transaction): RedirectResponse
    {
        if ($transaction->status === 'completed') {
            return back()->with('error', 'Giao dịch đã được xác nhận trước đó.');
        }

        if ($transaction->status === 'cancelled') {
            return back()->with('error', 'Giao dịch đã bị hủy, không thể xác nhận.');
        }

        if (!in_array($transaction->status, ['pending', 'waiting_admin'])) {
            return back()->with('error', 'Giao dịch không hợp lệ để xác nhận.');
        }

        $transaction->load('user');
        $user = $transaction->user;

        if (!$user) {
            return back()->with('error', 'Không tìm thấy người dùng của giao dịch này.');
        }

        DB::beginTransaction();

        try {
            $days = 30;

            $vipLevel = match ($transaction->vip_level) {
                'vip1' => 1,
                'vip2' => 2,
                'vip3' => 3,
                default => 0,
            };

            if ($vipLevel === 0) {
                throw new \RuntimeException('Gói VIP không hợp lệ.');
            }

            $currentExpire = $user->vip_expired_at
                ? Carbon::parse($user->vip_expired_at)
                : null;

            $baseDate = $currentExpire && $currentExpire->isFuture()
                ? $currentExpire
                : now();

            $user->vip_level = $vipLevel;
            $user->vip_expired_at = $baseDate->copy()->addDays($days);
            $user->save();

            $transaction->status = 'completed';
            $transaction->save();

            DB::commit();

            try {
                if ($user->email) {
                    Mail::to($user->email)->send(new VipActivatedMail($transaction, $user));
                }
            } catch (\Throwable $mailError) {
                Log::error('Gửi mail kích hoạt VIP thất bại', [
                    'transaction_id' => $transaction->id,
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $mailError->getMessage(),
                ]);
            }

            return back()->with('success', 'Đã xác nhận giao dịch và kích hoạt VIP thành công.');
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Lỗi xác nhận giao dịch VIP', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Xác nhận giao dịch thất bại: ' . $e->getMessage());
        }
    }

    public function cancel(Transaction $transaction): RedirectResponse
    {
        if ($transaction->status === 'completed') {
            return back()->with('error', 'Giao dịch đã hoàn thành, không thể hủy.');
        }

        if ($transaction->status === 'cancelled') {
            return back()->with('error', 'Giao dịch này đã bị hủy trước đó.');
        }

        if (!in_array($transaction->status, ['pending', 'waiting_admin'])) {
            return back()->with('error', 'Giao dịch không hợp lệ để hủy.');
        }

        $transaction->status = 'cancelled';
        $transaction->save();

        return back()->with('success', 'Đã hủy giao dịch.');
    }
}