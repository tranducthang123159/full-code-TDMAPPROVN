@extends('admin.layout.header')

@section('title', 'Danh sách file map người dùng')

@section('content')
    <style>
        .mapfiles-page {
            padding: 20px;
        }

        .mapfiles-card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }

        .mapfiles-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 18px 20px;
            border-bottom: 1px solid #eef2f7;
            background: linear-gradient(135deg, #f8fbff, #f3f7ff);
        }

        .mapfiles-card-header h4 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
        }

        .mapfiles-card-header p {
            margin: 4px 0 0;
            color: #6b7280;
            font-size: 14px;
        }

        .mapfiles-alerts {
            padding: 16px 20px 0;
        }

        .mapfiles-table-wrap {
            padding: 16px 20px 20px;
        }

        .table-mapfiles {
            width: 100%;
            margin-bottom: 0;
            border-collapse: separate;
            border-spacing: 0;
        }

        .table-mapfiles thead th {
            background: #f8fafc;
            color: #374151;
            font-weight: 700;
            font-size: 14px;
            white-space: nowrap;
            border-bottom: 1px solid #e5e7eb;
            padding: 14px 12px;
            vertical-align: middle;
        }

        .table-mapfiles tbody td {
            padding: 14px 12px;
            vertical-align: middle;
            border-bottom: 1px solid #eef2f7;
            font-size: 14px;
            color: #111827;
        }

        .table-mapfiles tbody tr:hover {
            background: #fafcff;
        }

        .user-cell .user-name {
            font-weight: 700;
            color: #111827;
            margin-bottom: 3px;
        }

        .user-cell .user-email {
            font-size: 13px;
            color: #6b7280;
            word-break: break-word;
        }

        .file-name {
            max-width: 260px;
            word-break: break-word;
            font-weight: 600;
            color: #1f2937;
        }

        .type-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 78px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .type-dcmoi {
            background: #fff7cc;
            color: #8a6d00;
        }

        .type-dccu {
            background: #dbeafe;
            color: #1d4ed8;
        }

        .type-quyhoach {
            background: #fee2e2;
            color: #b91c1c;
        }

        .type-default {
            background: #e5e7eb;
            color: #374151;
        }

        .area-info {
            line-height: 1.45;
        }

        .area-code {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 8px;
            background: #f3f4f6;
            color: #374151;
            font-size: 12px;
            font-weight: 700;
        }

        .actions-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            min-width: 210px;
        }

        .actions-group form {
            margin: 0;
        }

        .btn-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-download {
            background: #2563eb;
            color: #fff;
        }

        .btn-download:hover {
            background: #1d4ed8;
            color: #fff;
        }

        .btn-delete {
            background: #dc2626;
            color: #fff;
        }

        .btn-delete:hover {
            background: #b91c1c;
        }

        .btn-remove-area {
            background: #f59e0b;
            color: #fff;
        }

        .btn-remove-area:hover {
            background: #d97706;
        }

        .empty-box {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
            font-size: 15px;
        }

        .pagination-wrap {
            padding: 0 20px 20px;
        }

        @media (max-width: 991.98px) {
            .mapfiles-page {
                padding: 14px;
            }

            .mapfiles-card-header {
                padding: 16px;
            }

            .mapfiles-table-wrap {
                padding: 12px;
            }

            .table-mapfiles {
                min-width: 980px;
            }
        }

        @media (max-width: 767.98px) {
            .mapfiles-card-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .mapfiles-card-header h4 {
                font-size: 18px;
            }

            .mapfiles-alerts {
                padding: 12px 12px 0;
            }

            .mapfiles-table-wrap {
                padding: 10px;
            }

            .pagination-wrap {
                padding: 0 12px 14px;
            }

            .actions-group {
                min-width: 180px;
            }

            .btn-action {
                width: 100%;
            }
        }
    </style>

    <div class="mapfiles-page">
        <div class="mapfiles-card">
            <div class="mapfiles-card-header">
                <div>
                    <h4>Danh sách file map người dùng</h4>
                    <p>Quản lý file map, tải file, xóa file và gỡ xã của người dùng.</p>
                </div>
            </div>

            <div class="mapfiles-alerts">
                @if(session('success'))
                    <div class="alert alert-success">
                        {{ session('success') }}
                    </div>
                @endif

                @if(session('error'))
                    <div class="alert alert-danger">
                        {{ session('error') }}
                    </div>
                @endif
            </div>

            <div class="mapfiles-table-wrap">
                <div class="table-responsive">
                    <table class="table table-mapfiles align-middle">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Người dùng</th>
                                <th>Loại</th>
                                <th>Tên file</th>
                                <th>Tỉnh</th>
                                <th>Xã</th>
                                <th>Mã xã</th>
                                <th>Dung lượng</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($files as $file)
                                @php
                                    $typeClass = match(strtolower($file->type ?? '')) {
                                        'dcmoi', 'dc_moi' => 'type-dcmoi',
                                        'dccu', 'dc_cu' => 'type-dccu',
                                        'quyhoach', 'quy_hoach' => 'type-quyhoach',
                                        default => 'type-default',
                                    };
                                @endphp

                                <tr>
                                    <td><strong>#{{ $file->id }}</strong></td>

                                    <td class="user-cell">
                                        <div class="user-name">{{ $file->user->name ?? 'N/A' }}</div>
                                        <div class="user-email">{{ $file->user->email ?? '' }}</div>
                                    </td>

                                    <td>
                                        <span class="type-badge {{ $typeClass }}">
                                            {{ $file->type }}
                                        </span>
                                    </td>

                                    <td>
                                        <div class="file-name">{{ $file->file_name }}</div>
                                    </td>

                                    <td>
                                        <div class="area-info">{{ $file->province_name ?? '-' }}</div>
                                    </td>

                                    <td>
                                        <div class="area-info">{{ $file->area_name ?? '-' }}</div>
                                    </td>

                                    <td>
                                        @if($file->area_code)
                                            <span class="area-code">{{ $file->area_code }}</span>
                                        @else
                                            -
                                        @endif
                                    </td>

                                    <td>
                                        @if($file->file_size)
                                            {{ number_format($file->file_size / 1024 / 1024, 2) }} MB
                                        @else
                                            -
                                        @endif
                                    </td>

                                    <td>
                                        <div class="actions-group">
                                            <a href="{{ route('admin.mapfiles.download', $file->id) }}"
                                               class="btn-action btn-download">
                                                Tải file
                                            </a>

                                            <form action="{{ route('admin.mapfiles.destroy', $file->id) }}"
                                                  method="POST"
                                                  onsubmit="return confirm('Xóa file này?');">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="btn-action btn-delete">
                                                    Xóa file
                                                </button>
                                            </form>

                                            @if($file->user_id && $file->area_code)
                                                <form action="{{ route('admin.users.areas.remove', ['userId' => $file->user_id, 'areaCode' => $file->area_code]) }}"
                                                      method="POST"
                                                      onsubmit="return confirm('Gỡ xã này khỏi user? Hệ thống sẽ xóa toàn bộ file thuộc xã này của user.');">
                                                    @csrf
                                                    @method('DELETE')
                                                    <button type="submit" class="btn-action btn-remove-area">
                                                        Gỡ xã
                                                    </button>
                                                </form>
                                            @endif
                                        </div>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="9">
                                        <div class="empty-box">
                                            Chưa có dữ liệu file map.
                                        </div>
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="pagination-wrap">
                {{ $files->links() }}
            </div>
        </div>
    </div>
@endsection