@extends('admin.layout.header')

@section('title')
    Danh sách người dùng
@endsection

@section('content')

    <style>
        /* ===== CARD ===== */
        .card {
            border-radius: 14px;
            overflow: hidden;
        }

        /* ===== TABLE ===== */
        .table {
            margin: 0;
        }

        .table th {
            background: #f8f9fa;
            font-weight: 600;
            text-align: center;
            white-space: nowrap;
        }

        .table td {
            vertical-align: middle;
            text-align: center;
        }

        /* Hover giống Shopee */
        .table tbody tr:hover {
            background: #f1f3f5;
        }

        /* ===== USER NAME ===== */
        .user-name {
            font-weight: 600;
            color: #212529;
        }

        /* ===== STATUS ===== */
        .status-ok {
            color: #198754;
            font-weight: 500;
        }

        .status-no {
            color: #dc3545;
            font-weight: 500;
        }

        /* ===== BUTTON ===== */
        .btn-sm {
            border-radius: 8px;
        }

        /* ===== PAGINATION ===== */
        .pagination {
            justify-content: center;
            gap: 6px;
        }

        .page-link {
            border-radius: 10px;
            padding: 6px 12px;
            transition: 0.2s;
        }

        .page-link:hover {
            background: #0d6efd;
            color: #fff;
        }

        .page-item.active .page-link {
            background: #0d6efd;
            color: #fff;
        }

        /* ===== MOBILE ===== */
        @media (max-width: 768px) {

            .hide-mobile {
                display: none;
            }

            .table td,
            .table th {
                font-size: 13px;
                padding: 8px 4px;
            }

            .btn-sm {
                padding: 4px 6px;
                font-size: 12px;
            }

        }
    </style>

    <div class="container-fluid py-3">

        <div class="card shadow-sm">

            {{-- HEADER --}}
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold">👤 Danh sách người dùng</h5>
            </div>

            {{-- BODY --}}
            <div class="card-body p-0">

                <table class="table table-hover align-middle">

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Người dùng</th>
                            <th class="hide-mobile">Email</th>
                            <th class="hide-mobile">Quyền</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>

                    <tbody>

                        @foreach($users as $user)
                            <tr>

                                <td>{{ $user->id }}</td>

                                <td class="text-start">
                                    <div class="user-name">{{ $user->name }}</div>
                                </td>

                                <td class="hide-mobile text-muted">
                                    {{ $user->email }}
                                </td>

                                <td class="hide-mobile">
                                    @foreach($user->roles as $role)
                                        <span class="badge bg-light text-dark border">
                                            {{ $role->name }}
                                        </span>
                                    @endforeach
                                </td>

                                <td>
                                    @if($user->email_verified_at)
                                        <span class="status-ok">✔ Đã xác minh</span>
                                    @else
                                        <span class="status-no">✖ Chưa xác minh</span>
                                    @endif
                                </td>

                                <td>
                                    <div class="d-flex justify-content-center gap-2">

                                        <a href="{{ route('admin.users.edit', $user->id) }}" class="btn btn-outline-warning btn-sm">
                                            ✏️
                                        </a>

                                        <form action="{{ route('admin.users.destroy', $user->id) }}" method="POST"
                                            onsubmit="return confirmDelete()">

                                            @csrf
                                            @method('DELETE')

                                            <button class="btn btn-outline-danger btn-sm">
                                                🗑
                                            </button>

                                        </form>

                                    </div>
                                </td>

                            </tr>
                        @endforeach

                    </tbody>

                </table>

                {{-- PAGINATION --}}
                <div class="p-3">

                    <div class="d-flex flex-column align-items-center gap-2">

                        <div class="text-muted small">
                            Hiển thị {{ $users->firstItem() }} - {{ $users->lastItem() }} / {{ $users->total() }}
                        </div>

                        {{ $users->links('pagination::bootstrap-5') }}

                    </div>

                </div>

            </div>

        </div>

    </div>

    <script>
        function confirmDelete() {
            return confirm("Bạn có chắc muốn xóa user này?");
        }
    </script>

@endsection