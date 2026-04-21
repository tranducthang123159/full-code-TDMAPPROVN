@extends('admin.layout.header')

@section('title')
    Quản lý thiết bị đăng nhập
@endsection

@section('content')

    <style>
        .device-page .card {
            border: none;
            border-radius: 14px;
            overflow: hidden;
        }

        .device-page .card-header {
            padding: 14px 18px;
        }

        .device-page .table {
            margin-bottom: 0;
            white-space: nowrap;
        }

        .device-page .table th,
        .device-page .table td {
            vertical-align: middle;
            font-size: 14px;
        }

        .device-page .device-name {
            min-width: 180px;
            white-space: normal;
            word-break: break-word;
            line-height: 1.4;
        }

        .device-page .user-col,
        .device-page .email-col,
        .device-page .phone-col {
            white-space: normal;
            word-break: break-word;
            min-width: 140px;
        }

        .device-page .action-wrap {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            justify-content: center;
            min-width: 220px;
        }

        .device-page .action-wrap form {
            margin: 0;
        }

        .device-page .badge {
            font-size: 12px;
            padding: 6px 8px;
        }

        .device-page .table-responsive {
            overflow-x: auto;
        }

        .device-page .hint-box {
            font-size: 13px;
            line-height: 1.8;
        }

        @media (max-width: 992px) {
            .device-page .table th,
            .device-page .table td {
                font-size: 13px;
                padding: 10px 8px;
            }

            .device-page .btn {
                font-size: 12px;
                padding: 5px 8px;
            }

            .device-page .card-header h5 {
                font-size: 16px;
            }
        }

        @media (max-width: 768px) {
            .device-page .card-header {
                display: block !important;
            }

            .device-page .card-header h5 {
                margin-bottom: 10px !important;
            }

            .device-page .header-actions {
                width: 100%;
            }

            .device-page .header-actions form {
                width: 100%;
            }

            .device-page .header-actions .btn {
                width: 100%;
            }

            .device-page .table th,
            .device-page .table td {
                font-size: 12px;
                padding: 8px 6px;
            }

            .device-page .device-name {
                min-width: 160px;
            }

            .device-page .action-wrap {
                min-width: 180px;
                flex-direction: column;
                align-items: stretch;
            }

            .device-page .action-wrap .btn {
                width: 100%;
            }
        }
    </style>

    <div class="container-fluid mt-3 device-page">

        @if (session('success'))
            <div class="alert alert-success mx-1 mx-md-3">
                {{ session('success') }}
            </div>
        @endif

        @if ($errors->any())
            <div class="alert alert-danger mx-1 mx-md-3">
                {{ $errors->first() }}
            </div>
        @endif

        <div class="card shadow">

            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 class="mb-0">Quản lý thiết bị đăng nhập</h5>

                <div class="header-actions">
                    <form method="POST" action="{{ route('devices.logoutAll') }}">
                        @csrf
                        <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-sign-out-alt"></i>
                            Đăng xuất tất cả thiết bị
                        </button>
                    </form>
                </div>
            </div>

            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover text-center align-middle">
                        <thead class="thead-dark">
                            <tr>
                                <th>User</th>
                                <th>SĐT</th>
                                <th>Email</th>
                                <th>Thiết bị</th>
                                <th>Loại</th>
                                <th>IP</th>
                                <th>Trình duyệt</th>
                                <th>Hệ điều hành</th>
                                <th>Hoạt động cuối</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            @forelse($devices as $device)
                                <tr>
                                    <td class="user-col">
                                        <strong>{{ $device->user->name ?? 'Không có' }}</strong>
                                    </td>

                                    <td class="phone-col">
                                        {{ $device->user->phone ?? ($device->user->sdt ?? 'Không có') }}
                                    </td>

                                    <td class="email-col">
                                        {{ $device->user->email ?? 'Không có' }}
                                    </td>

                                    <td class="device-name">
                                        {{ $device->device_name }}
                                    </td>

                                    <td>
                                        @if($device->device_type === 'mobile')
                                            <span class="badge bg-info text-dark">Mobile</span>
                                        @else
                                            <span class="badge bg-secondary">Desktop</span>
                                        @endif
                                    </td>

                                    <td>{{ $device->ip_address }}</td>
                                    <td>{{ $device->browser_name }}</td>
                                    <td>{{ $device->platform_name }}</td>

                                    <td>
                                        {{ optional($device->last_seen_at)->format('d/m/Y H:i') }}
                                    </td>

                                    <td>
                                        @if($device->is_active)
                                            <span class="badge bg-success">Đang hoạt động</span>
                                        @else
                                            <span class="badge bg-secondary">Đã đăng xuất</span>
                                        @endif

                                        @if(isset($currentDeviceToken) && $currentDeviceToken === $device->device_token)
                                            <div class="mt-1">
                                                <small class="text-primary">Thiết bị hiện tại</small>
                                            </div>
                                        @endif
                                    </td>

                                    <td>
                                        <div class="action-wrap">
                                            @if($device->is_active)
                                                <form method="POST" action="{{ route('devices.deactivate', $device->id) }}">
                                                    @csrf
                                                    <button type="submit" class="btn btn-warning btn-sm">
                                                        <i class="fa fa-sign-out-alt"></i>
                                                        Đăng xuất
                                                    </button>
                                                </form>
                                            @endif

                                            <form method="POST" action="{{ route('devices.revoke', $device->id) }}"
                                                  onsubmit="return confirm('Thu hồi thiết bị này? Sau đó thiết bị này sẽ không dùng lại được, và slot sẽ được mở cho máy khác.')">
                                                @csrf
                                                <button type="submit" class="btn btn-danger btn-sm">
                                                    <i class="fa fa-ban"></i>
                                                    Thu hồi
                                                </button>
                                            </form>

                                            <form method="POST" action="{{ route('devices.destroy', $device->id) }}"
                                                  onsubmit="return confirm('Bạn có chắc muốn xóa hẳn bản ghi thiết bị này không?')">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="btn btn-dark btn-sm">
                                                    <i class="fa fa-trash"></i>
                                                    Xóa
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="11" class="text-center text-muted py-4">
                                        Chưa có thiết bị nào.
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card-footer text-muted hint-box">
                <strong>Gợi ý:</strong>
                VIP 1: tối đa 1 điện thoại + 1 máy tính |
                VIP 2: tối đa 4 điện thoại + 4 máy tính |
                VIP 3: không giới hạn
            </div>

        </div>

    </div>

@endsection