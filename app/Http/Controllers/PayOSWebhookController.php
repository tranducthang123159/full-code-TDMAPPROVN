<?php

namespace App\Http\Controllers;

use App\Mail\AdminNewVipOrderMail;
use App\Mail\VipActivatedMail;
use App\Models\Transaction;
use App\Services\PayOSService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PayOSWebhookController extends Controller
{
    public function handle(Request $request, PayOSService $payOSService)
    {
        $payload = $request->all();

        Log::error('PAYOS WEBHOOK HIT', [
            'method' => $request->method(),
            'payload' => $payload,
        ]);

        try {
            $verified = $payOSService->client()->webhooks->verify($payload);

            Log::error('PAYOS WEBHOOK VERIFIED', [
                'orderCode' => $verified->orderCode ?? null,
                'amount' => $verified->amount ?? null,
            ]);

            $orderCode = (string) $verified->orderCode;
            $amount = (int) $verified->amount;

            $this->completeTransactionByOrderCode($orderCode, $amount, $payload);

            return response()->json([
                'error' => 0,
                'message' => 'OK',
            ]);
        } catch (\Throwable $e) {
            Log::error('PAYOS WEBHOOK ERROR', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);

            return response()->json([
                'error' => -1,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function return(Request $request)
    {
        $transactionId = (int) $request->query('transaction_id');

        if ($transactionId) {
            try {
                $transaction = Transaction::with('user')->find($transactionId);

                if ($transaction && $transaction->status !== 'completed') {
                    $this->completeTransactionFallback($transaction);
                }
            } catch (\Throwable $e) {
                Log::error('PAYOS RETURN FALLBACK ERROR', [
                    'transaction_id' => $transactionId,
                    'error' => $e->getMessage(),
                ]);
            }

            return redirect()->route('vip.payment.order.show', $transactionId)
                ->with('success', 'Đã quay lại từ cổng thanh toán. Hệ thống đang đối soát.');
        }

        return redirect()->route('vip.payment')
            ->with('success', 'Đã quay lại từ cổng thanh toán.');
    }

    public function cancel(Request $request)
    {
        $transactionId = $request->query('transaction_id');

        if ($transactionId) {
            $transaction = Transaction::where('id', $transactionId)
                ->whereIn('status', ['pending', 'processing'])
                ->first();

            if ($transaction) {
                $transaction->update([
                    'status' => 'cancelled',
                ]);
            }
        }

        return redirect()->route('vip.payment')
            ->with('error', 'Bạn đã huỷ thanh toán.');
    }

    private function completeTransactionByOrderCode(string $orderCode, int $amount, array $payload = []): void
    {
        DB::transaction(function () use ($orderCode, $amount, $payload) {
            $transaction = Transaction::with('user')
                ->where('order_code', $orderCode)
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                throw new \RuntimeException('Không tìm thấy transaction với order_code=' . $orderCode);
            }

            if ($transaction->status === 'completed') {
                return;
            }

            if ((int) $transaction->amount !== $amount) {
                throw new \RuntimeException('Sai số tiền thanh toán.');
            }

            $this->markTransactionCompleted($transaction, $payload);
        });
    }

    private function completeTransactionFallback(Transaction $transaction): void
    {
        DB::transaction(function () use ($transaction) {
            $transaction = Transaction::with('user')
                ->where('id', $transaction->id)
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                throw new \RuntimeException('Không tìm thấy transaction fallback.');
            }

            if ($transaction->status === 'completed') {
                return;
            }

            $this->markTransactionCompleted($transaction, [
                'source' => 'return_fallback',
                'transaction_id' => $transaction->id,
            ]);
        });
    }

    private function markTransactionCompleted(Transaction $transaction, array $payload = []): void
    {
        $transaction->update([
            'status' => 'completed',
            'paid_at' => now(),
            'completed_at' => now(),
            'payos_webhook_data' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'user_confirmed_paid' => true,
        ]);

        $user = $transaction->user;

        if (!$user) {
            throw new \RuntimeException('Không tìm thấy user của transaction.');
        }

        $newVipLevel = match ($transaction->vip_level) {
            'vip1' => 1,
            'vip2' => 2,
            'vip3' => 3,
            default => 0,
        };

        $baseDate = ($user->vip_expired_at && now()->lt($user->vip_expired_at))
            ? $user->vip_expired_at
            : now();

        $user->update([
            'vip_level' => $newVipLevel,
            'vip_expired_at' => $baseDate->copy()->addYear(),
        ]);

        try {
            if ($user->email) {
                Mail::to($user->email)->send(new VipActivatedMail($transaction, $user));
            }
        } catch (\Throwable $e) {
            Log::error('Gửi mail kích hoạt VIP thất bại', [
                'transaction_id' => $transaction->id,
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $adminEmail = config('mail.admin_address');

            if ($adminEmail) {
                Mail::to($adminEmail)->send(new AdminNewVipOrderMail($transaction));
            } else {
                Log::warning('Chưa cấu hình ADMIN_EMAIL nên không gửi được mail admin.', [
                    'transaction_id' => $transaction->id,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Gửi mail admin giao dịch VIP thành công thất bại', [
                'transaction_id' => $transaction->id,
                'admin_email' => config('mail.admin_address'),
                'error' => $e->getMessage(),
            ]);
        }

        Log::error('PAYOS COMPLETE SUCCESS', [
            'transaction_id' => $transaction->id,
            'user_id' => $user->id,
            'vip_level' => $newVipLevel,
            'order_code' => $transaction->order_code,
        ]);
    }
}