<?php

namespace App\Http\Controllers;

use App\Mail\VipOrderCreatedMail;
use App\Models\Transaction;
use App\Services\PayOSService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class VipController extends Controller
{
    public function paymentPage()
    {
        $user = Auth::user();
        $currentVip = $user?->getCurrentVipLevel() ?? 0;

        $packages = [
            [
                'code' => 'vip1',
                'name' => 'Gói 1 xã',
                'price' => 10000,
                'duration' => '1 năm',
                'area_limit' => 1,
                'area_text' => 'Dùng 1 xã/phường trong 1 năm',
                'benefits' => [
                    'Sử dụng tối đa 1 xã/phường',
                    'Mỗi địa bàn được 1 file / loại: Địa chính cũ, Địa chính mới, Quy hoạch',
                    'Được cập nhật lại file mới đúng mã xã đã đăng ký',
                    'Xóa file cũ không mất slot',
                    'Phù hợp nhu cầu dùng ít địa bàn',
                ],
            ],
            [
                'code' => 'vip2',
                'name' => 'Gói 6 xã',
                'price' => 20000,
                'duration' => '1 năm',
                'area_limit' => 6,
                'area_text' => 'Gói 5 xã tặng 1 xã, dùng tổng 6 xã/phường trong 1 năm',
                'benefits' => [
                    'Đăng ký tổng cộng 6 xã/phường',
                    'Tính theo gói 5 xã tặng thêm 1 xã',
                    'Mỗi địa bàn được 1 file / loại: Địa chính cũ, Địa chính mới, Quy hoạch',
                    'Các xã đã đăng ký có thể cập nhật lại file mới',
                    'Xóa file cũ không làm mất slot xã',
                ],
            ],
            [
                'code' => 'vip3',
                'name' => 'Gói nhiều xã',
                'price' => 30000,
                'duration' => '1 năm',
                'area_limit' => -1,
                'area_text' => 'Dùng nhiều xã/phường trong 1 năm',
                'benefits' => [
                    'Sử dụng nhiều xã/phường',
                    'Mỗi địa bàn được 1 file / loại: Địa chính cũ, Địa chính mới, Quy hoạch',
                    'Được thay file cũ bằng file mới bất cứ lúc nào',
                    'Không bị bó hẹp ít địa bàn',
                    'Phù hợp cho người dùng làm việc diện rộng',
                ],
            ],
        ];

        return view('vip.payment', compact('user', 'packages', 'currentVip'));
    }

    public function createOrder(Request $request, PayOSService $payOSService): JsonResponse
    {
        $request->validate([
            'vip' => ['required', 'in:vip1,vip2,vip3'],
        ]);

        $user = Auth::user();
        $vip = $request->input('vip');
        $currentVip = $user?->getCurrentVipLevel() ?? 0;

        $vipMap = [
            'vip1' => 1,
            'vip2' => 2,
            'vip3' => 3,
        ];

        // Chặn hạ gói: đang VIP 2/3 thì không cho tạo đơn VIP 1
        if (($vipMap[$vip] ?? 0) < $currentVip) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đang dùng gói VIP cao hơn, không thể chọn gói thấp hơn.',
            ], 422);
        }

        $existingPending = Transaction::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'processing'])
            ->latest('id')
            ->first();

        if ($existingPending && !empty($existingPending->checkout_url)) {
            return response()->json([
                'success' => true,
                'message' => 'Bạn đang có đơn chờ thanh toán.',
                'transaction_id' => $existingPending->id,
                'redirect_url' => $existingPending->checkout_url,
                'reused' => true,
            ]);
        }

        $amount = match ($vip) {
            'vip1' => 10000,
            'vip2' => 20000,
            'vip3' => 30000,
        };

        $packageName = match ($vip) {
            'vip1' => 'Gói 1 xã',
            'vip2' => 'Gói 6 xã',
            'vip3' => 'Gói nhiều xã',
        };

        $orderCode = random_int(100000000, 999999999);

        DB::beginTransaction();

        try {
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'vip_level' => $vip,
                'amount' => $amount,
                'transaction_code' => strtoupper($vip) . '_' . $user->id . '_' . time(),
                'order_code' => $orderCode,
                'status' => 'pending',
                'user_confirmed_paid' => false,
            ]);

            $paymentData = [
                'orderCode' => $orderCode,
                'amount' => $amount,
                'description' => 'NAP VIP ' . strtoupper($vip),
                'items' => [
                    [
                        'name' => $packageName,
                        'quantity' => 1,
                        'price' => $amount,
                    ]
                ],
                'cancelUrl' => config('payos.cancel_url') . '?transaction_id=' . $transaction->id,
                'returnUrl' => config('payos.return_url') . '?transaction_id=' . $transaction->id,
            ];

            $result = $payOSService->client()->paymentRequests->create($paymentData);

            $transaction->update([
                'payment_link_id' => $result->paymentLinkId ?? null,
                'checkout_url' => $result->checkoutUrl ?? null,
                'status' => 'processing',
            ]);

            DB::commit();

            try {
                if ($user && $user->email) {
                    Mail::to($user->email)->send(new VipOrderCreatedMail($transaction));
                }
            } catch (\Throwable $mailError) {
                Log::error('Gửi mail tạo đơn VIP thất bại', [
                    'transaction_id' => $transaction->id,
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $mailError->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Tạo link thanh toán thành công.',
                'transaction_id' => $transaction->id,
                'redirect_url' => $transaction->checkout_url,
                'reused' => false,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('createOrder payOS failed', [
                'user_id' => $user->id,
                'vip' => $vip,
                'amount' => $amount ?? null,
                'order_code' => $orderCode ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không tạo được link thanh toán. ' . $e->getMessage(),
            ], 500);
        }
    }

    public function showOrder(int $transactionId)
    {
        $transaction = Transaction::where('id', $transactionId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $packageName = match ($transaction->vip_level) {
            'vip1' => 'Gói 1 xã',
            'vip2' => 'Gói 6 xã',
            'vip3' => 'Gói nhiều xã',
            default => strtoupper((string) $transaction->vip_level),
        };

        return view('vip.order', [
            'transaction' => $transaction,
            'packageName' => $packageName,
            'bankName' => 'MBBank',
            'accountNo' => '90383899999',
            'accountName' => 'DO HONG LIEN TAI',
            'qrUrl' => asset('images/qr.jpg'),
        ]);
    }

    public function checkStatus(int $transactionId): JsonResponse
    {
        $transaction = Transaction::where('id', $transactionId)
            ->where('user_id', Auth::id())
            ->first();

        if (!$transaction) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy giao dịch.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'transaction_id' => $transaction->id,
            'status' => $transaction->status,
            'vip' => $transaction->vip_level,
            'amount' => $transaction->amount,
            'transaction_code' => $transaction->transaction_code,
            'redirect_home' => $transaction->status === 'completed',
            'home_url' => route('home'),
        ]);
    }
}