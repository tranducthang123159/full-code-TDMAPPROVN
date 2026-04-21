@extends('admin.layout.header')

@section('content')
    <style>
        .vip-page {
            padding: 28px 0;
        }

        .vip-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 22px;
        }

        .vip-title-wrap h2 {
            margin: 0;
            font-size: 30px;
            font-weight: 800;
            color: #111827;
        }

        .vip-title-wrap p {
            margin: 6px 0 0;
            color: #6b7280;
            font-size: 15px;
        }

        .vip-filter-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }

        .vip-filter-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 16px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            border: 1px solid transparent;
            transition: .2s ease;
        }

        .vip-filter-btn:hover {
            transform: translateY(-1px);
            opacity: .96;
        }

        .vip-filter-btn.all {
            background: #eef2ff;
            color: #3730a3;
            border-color: #c7d2fe;
        }

        .vip-filter-btn.pending {
            background: #fff7ed;
            color: #b45309;
            border-color: #fed7aa;
        }

        .vip-filter-btn.completed {
            background: #ecfdf5;
            color: #047857;
            border-color: #a7f3d0;
        }

        .vip-filter-btn.cancelled {
            background: #fef2f2;
            color: #b91c1c;
            border-color: #fecaca;
        }

        .vip-filter-btn.active {
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
        }

        .vip-card {
            background: #fff;
            border-radius: 18px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
            overflow: hidden;
        }

        .vip-card-head {
            padding: 18px 22px;
            border-bottom: 1px solid #eef2f7;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .vip-card-head h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            color: #111827;
        }

        .vip-card-head span {
            color: #6b7280;
            font-size: 14px;
        }

        .vip-table-wrap {
            overflow-x: auto;
        }

        .vip-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            min-width: 1200px;
        }

        .vip-table thead th {
            background: #f8fafc;
            color: #374151;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .3px;
            padding: 14px 16px;
            border-bottom: 1px solid #e5e7eb;
            white-space: nowrap;
        }

        .vip-table tbody td {
            padding: 16px;
            border-bottom: 1px solid #eef2f7;
            vertical-align: middle;
            color: #111827;
            font-size: 14px;
        }

        .vip-table tbody tr:hover {
            background: #fcfcfd;
        }

        .vip-id {
            font-weight: 800;
            color: #1d4ed8;
        }

        .vip-user {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .vip-user-name {
            font-weight: 800;
            color: #111827;
        }

        .vip-user-email {
            color: #6b7280;
            font-size: 13px;
        }

        .vip-user-phone {
            color: #0f766e;
            font-size: 13px;
            font-weight: 700;
        }

        .vip-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 7px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
        }

        .vip-badge.pending {
            background: #fff7ed;
            color: #b45309;
            border: 1px solid #fed7aa;
        }

        .vip-badge.waiting-admin {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
        }

        .vip-badge.completed {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
        }

        .vip-badge.cancelled {
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }

        .vip-badge.other {
            background: #f3f4f6;
            color: #4b5563;
            border: 1px solid #d1d5db;
        }

        .vip-plan {
            font-weight: 800;
            color: #7c3aed;
        }

        .vip-money {
            font-weight: 800;
            color: #b45309;
            white-space: nowrap;
        }

        .vip-code {
            display: inline-block;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            color: #1e293b;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 800;
            word-break: break-all;
        }

        .vip-date {
            white-space: nowrap;
            color: #475569;
            font-weight: 600;
        }

        .vip-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .vip-btn {
            border: none;
            border-radius: 10px;
            padding: 9px 14px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            transition: .2s ease;
        }

        .vip-btn:hover {
            transform: translateY(-1px);
            opacity: .96;
        }

        .vip-btn-confirm {
            background: #16a34a;
            color: #fff;
        }

        .vip-btn-cancel {
            background: #dc2626;
            color: #fff;
        }

        .vip-empty {
            text-align: center;
            padding: 38px 20px;
            color: #6b7280;
            font-weight: 600;
        }

        .vip-alert {
            border-radius: 14px;
            padding: 14px 16px;
            font-weight: 700;
            margin-bottom: 16px;
            border: 1px solid transparent;
        }

        .vip-alert.success {
            background: #ecfdf5;
            color: #166534;
            border-color: #bbf7d0;
        }

        .vip-alert.error {
            background: #fef2f2;
            color: #b91c1c;
            border-color: #fecaca;
        }

        .vip-pagination {
            padding: 18px 22px;
            border-top: 1px solid #eef2f7;
            background: #fff;
        }

        @media (max-width: 768px) {
            .vip-title-wrap h2 {
                font-size: 24px;
            }
        }
    </style>

    <div class="container vip-page">
        <div class="vip-topbar">
            <div class="vip-title-wrap">
                <h2>Quản lý giao dịch VIP</h2>
                <p>Theo dõi đơn thanh toán, xác nhận giao dịch và bật VIP cho người dùng.</p>
            </div>
        </div>

        @if(session('success'))
            <div class="vip-alert success">
                {{ session('success') }}
            </div>
        @endif

        @if(session('error'))
            <div class="vip-alert error">
                {{ session('error') }}
            </div>
        @endif

        <div class="vip-filter-group">
            <a href="{{ route('admin.vip.transactions.index') }}"
                class="vip-filter-btn all {{ request('status') ? '' : 'active' }}">
                Tất cả
            </a>

            <a href="{{ route('admin.vip.transactions.index', ['status' => 'pending']) }}"
                class="vip-filter-btn pending {{ request('status') === 'pending' ? 'active' : '' }}">
                Chờ xác nhận
            </a>

            <a href="{{ route('admin.vip.transactions.index', ['status' => 'completed']) }}"
                class="vip-filter-btn completed {{ request('status') === 'completed' ? 'active' : '' }}">
                Đã hoàn thành
            </a>

            <a href="{{ route('admin.vip.transactions.index', ['status' => 'cancelled']) }}"
                class="vip-filter-btn cancelled {{ request('status') === 'cancelled' ? 'active' : '' }}">
                Đã hủy
            </a>
        </div>

        <div class="vip-card">
            <div class="vip-card-head">
                <h3>Danh sách giao dịch</h3>
                <span>Tổng: {{ $transactions->total() }} giao dịch</span>
            </div>

            <div class="vip-table-wrap">
                <table class="vip-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Người dùng</th>
                            <th>Email</th>
                            <th>SĐT</th>
                            <th>Gói VIP</th>
                            <th>Số tiền</th>
                            <th>Mã nội dung CK</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th width="220">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($transactions as $transaction)
                            <tr>
                                <td>
                                    <span class="vip-id">#{{ $transaction->id }}</span>
                                </td>

                                <td>
                                    <div class="vip-user">
                                        <span class="vip-user-name">{{ $transaction->user->name ?? 'Không có user' }}</span>
                                    </div>
                                </td>

                                <td>
                                    <span class="vip-user-email">{{ $transaction->user->email ?? '-' }}</span>
                                </td>

                                <td>
                                    <span class="vip-user-phone">{{ $transaction->user->phone ?? '-' }}</span>
                                </td>

                                <td>
                                    <span class="vip-plan">{{ strtoupper($transaction->vip_level) }}</span>
                                </td>

                                <td>
                                    <span class="vip-money">{{ number_format($transaction->amount, 0, ',', '.') }}đ</span>
                                </td>

                                <td>
                                    <span class="vip-code">{{ $transaction->transaction_code }}</span>
                                </td>

                                <td>
                                    @if($transaction->status === 'pending')
                                        <span class="vip-badge pending">Chờ tạo đơn</span>
                                    @elseif($transaction->status === 'waiting_admin')
                                        <span class="vip-badge waiting-admin">Chờ admin duyệt</span>
                                    @elseif($transaction->status === 'completed')
                                        <span class="vip-badge completed">Đã hoàn thành</span>
                                    @elseif($transaction->status === 'cancelled')
                                        <span class="vip-badge cancelled">Đã hủy</span>
                                    @else
                                        <span class="vip-badge other">{{ $transaction->status }}</span>
                                    @endif
                                </td>

                                <td>
                                    <span class="vip-date">{{ $transaction->created_at?->format('d/m/Y H:i') }}</span>
                                </td>

                                <td>
                                    @if(in_array($transaction->status, ['pending', 'waiting_admin']))
                                        <div class="vip-actions">
                                            <form action="{{ route('admin.vip.transactions.confirm', $transaction->id) }}"
                                                method="POST">
                                                @csrf
                                                <button type="submit" class="vip-btn vip-btn-confirm"
                                                    onclick="return confirm('Xác nhận giao dịch này và bật VIP cho user?')">
                                                    Xác nhận
                                                </button>
                                            </form>

                                            <form action="{{ route('admin.vip.transactions.cancel', $transaction->id) }}"
                                                method="POST">
                                                @csrf
                                                <button type="submit" class="vip-btn vip-btn-cancel"
                                                    onclick="return confirm('Hủy giao dịch này?')">
                                                    Hủy
                                                </button>
                                            </form>
                                        </div>
                                    @else
                                        <span style="color:#9ca3af;font-weight:700;">Không có thao tác</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="10" class="vip-empty">
                                    Chưa có giao dịch nào
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <div class="vip-pagination">
                {{ $transactions->withQueryString()->links() }}
            </div>
        </div>
    </div>
@endsection