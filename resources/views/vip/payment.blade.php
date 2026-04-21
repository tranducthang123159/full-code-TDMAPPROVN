<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Nâng cấp VIP</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

    <style>
        html, body{
            width:100%;
            min-height:100vh;
            overflow-x:hidden !important;
            overflow-y:auto !important;
        }

        *{
            box-sizing:border-box;
            margin:0;
            padding:0;
        }

        :root{
            --bg-1:#f8fafc;
            --bg-2:#eef2ff;
            --card:#ffffff;
            --text:#0f172a;
            --muted:#64748b;
            --line:#e5e7eb;
            --primary:#f59e0b;
            --primary-2:#f97316;
            --shadow:0 18px 50px rgba(15,23,42,0.08);
        }

        html, body{
            background:
                radial-gradient(circle at top left, rgba(245,158,11,0.12), transparent 320px),
                radial-gradient(circle at top right, rgba(59,130,246,0.10), transparent 380px),
                linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
            color:var(--text);
            font-family:Arial, Helvetica, sans-serif;
        }

        .vip-page{
            min-height:100vh;
            padding:36px 16px 60px;
        }

        .container{
            width:100%;
            max-width:1240px;
            margin:0 auto;
        }

        .hero{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:24px;
            flex-wrap:wrap;
            margin-bottom:30px;
            padding:32px;
            border-radius:30px;
            background:rgba(255,255,255,0.82);
            backdrop-filter:blur(10px);
            border:1px solid rgba(255,255,255,0.7);
            box-shadow:var(--shadow);
        }

        .hero-left{
            flex:1;
            min-width:280px;
        }

        .badge{
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:8px 14px;
            border-radius:999px;
            background:#fff7ed;
            border:1px solid #fed7aa;
            color:#c2410c;
            font-size:13px;
            font-weight:800;
            margin-bottom:16px;
        }

        .hero h1{
            font-size:40px;
            line-height:1.15;
            font-weight:900;
            margin-bottom:12px;
        }

        .hero p{
            font-size:16px;
            line-height:1.75;
            color:var(--muted);
            max-width:760px;
        }

        .hero-stats{
            display:flex;
            gap:14px;
            flex-wrap:wrap;
        }

        .mini-card{
            min-width:150px;
            background:#fff;
            border:1px solid var(--line);
            border-radius:20px;
            padding:18px 16px;
            box-shadow:0 10px 24px rgba(15,23,42,0.05);
        }

        .mini-card strong{
            display:block;
            font-size:22px;
            margin-bottom:6px;
        }

        .mini-card span{
            color:var(--muted);
            font-size:14px;
        }

        .section-title{
            font-size:24px;
            font-weight:900;
            margin-bottom:18px;
        }

        .plans-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));
            gap:24px;
        }

        .plan-card{
            position:relative;
            background:rgba(255,255,255,0.96);
            border:1px solid var(--line);
            border-radius:28px;
            box-shadow:0 16px 35px rgba(15,23,42,0.07);
            overflow:hidden;
            transition:all .25s ease;
        }

        .plan-card:hover{
            transform:translateY(-5px);
            box-shadow:0 22px 45px rgba(15,23,42,0.11);
        }

        .plan-card::before{
            content:"";
            position:absolute;
            top:0;
            left:0;
            right:0;
            height:6px;
            background:linear-gradient(90deg, var(--primary), var(--primary-2));
        }

        .plan-card-locked{
            opacity:.9;
        }

        .plan-card-locked::after{
            content:"";
            position:absolute;
            inset:0;
            background:rgba(255,255,255,0.18);
            pointer-events:none;
        }

        .plan-body{
            padding:28px;
        }

        .chip-row{
            display:flex;
            align-items:center;
            gap:8px;
            flex-wrap:wrap;
            margin-bottom:14px;
        }

        .chip{
            display:inline-block;
            padding:7px 12px;
            border-radius:999px;
            font-size:12px;
            font-weight:800;
        }

        .chip-blue{
            background:#eff6ff;
            color:#1d4ed8;
        }

        .chip-green{
            background:#ecfdf5;
            color:#166534;
        }

        .chip-red{
            background:#fee2e2;
            color:#b91c1c;
        }

        .plan-title{
            font-size:28px;
            font-weight:900;
            margin-bottom:10px;
        }

        .plan-price{
            font-size:44px;
            font-weight:900;
            color:#b45309;
            letter-spacing:-1px;
            margin-bottom:12px;
        }

        .plan-price small{
            font-size:17px;
            color:var(--muted);
            font-weight:700;
        }

        .area-box{
            margin-bottom:18px;
            padding:12px 14px;
            border-radius:16px;
            background:#f8fafc;
            border:1px solid var(--line);
            font-size:15px;
            font-weight:800;
        }

        .meta{
            margin-bottom:18px;
        }

        .meta-line{
            padding:10px 0;
            border-bottom:1px dashed var(--line);
            color:#475569;
            font-size:15px;
            line-height:1.7;
        }

        .meta-line:last-child{
            border-bottom:none;
        }

        .benefits{
            padding-left:18px;
            margin-bottom:22px;
            color:#334155;
        }

        .benefits li{
            margin-bottom:8px;
            line-height:1.6;
            font-size:14px;
        }

        .btn{
            width:100%;
            border:none;
            border-radius:16px;
            padding:15px 18px;
            font-size:16px;
            font-weight:800;
            cursor:pointer;
            transition:.2s ease;
        }

        .btn-primary{
            background:linear-gradient(135deg, var(--primary), var(--primary-2));
            color:#fff;
            box-shadow:0 10px 24px rgba(249,115,22,0.28);
        }

        .btn-primary:hover{
            transform:translateY(-2px);
        }

        .btn:disabled{
            opacity:.75;
            cursor:not-allowed;
            transform:none;
        }

        .btn[disabled][data-locked="1"]{
            background:#cbd5e1 !important;
            color:#475569 !important;
            box-shadow:none !important;
            cursor:not-allowed;
        }

        @media (max-width: 768px){
            .vip-page{
                padding:24px 14px 40px;
            }

            .hero{
                padding:22px 18px;
                border-radius:22px;
            }

            .hero h1{
                font-size:30px;
            }

            .hero p{
                font-size:15px;
            }

            .plan-title{
                font-size:24px;
            }

            .plan-price{
                font-size:36px;
            }
        }
    </style>
</head>
<body>

@include('components.header')

<div class="vip-page">
    <div class="container">

        <div class="hero">
            <div class="hero-left">
                <div class="badge">⭐ Nâng cấp tài khoản VIP</div>
                <h1>Chọn gói VIP theo số xã/phường bạn cần dùng</h1>
                <p>
                    Mỗi gói VIP sẽ giới hạn theo <b>địa bàn xã/phường</b>, không còn tính kiểu số file tổng.
                    Khi đã đăng ký địa bàn, bạn có thể xóa file cũ và tải lại file mới đúng mã xã đó mà không mất slot.
                </p>
            </div>

            <div class="hero-stats">
                <div class="mini-card">
                    <strong>VIP 1</strong>
                    <span>1 xã/phường</span>
                </div>
                <div class="mini-card">
                    <strong>VIP 2</strong>
                    <span>6 xã/phường</span>
                </div>
                <div class="mini-card">
                    <strong>VIP 3</strong>
                    <span>Không giới hạn</span>
                </div>
            </div>
        </div>

        <div class="section-title">Danh sách gói VIP</div>

        <div class="plans-grid">
            @foreach($packages as $package)
                @php
                    $packageLevel = match($package['code']) {
                        'vip1' => 1,
                        'vip2' => 2,
                        'vip3' => 3,
                        default => 0,
                    };

                    $isCurrent = ($currentVip === 1 && $package['code'] === 'vip1')
                              || ($currentVip === 2 && $package['code'] === 'vip2')
                              || ($currentVip === 3 && $package['code'] === 'vip3');

                    $isLocked = $currentVip > 0 && $packageLevel < $currentVip;
                @endphp

                <div class="plan-card {{ $isLocked ? 'plan-card-locked' : '' }}">
                    <div class="plan-body">
                        <div class="chip-row">
                            <span class="chip chip-blue">GÓI NÂNG CẤP</span>

                            @if($isCurrent)
                                <span class="chip chip-green">ĐANG DÙNG</span>
                            @endif

                            @if($isLocked)
                                <span class="chip chip-red">ĐÃ KHÓA</span>
                            @endif
                        </div>

                        <div class="plan-title">{{ $package['name'] }}</div>

                        <div class="plan-price">
                            {{ number_format($package['price'], 0, ',', '.') }}đ
                            <small>/ {{ $package['duration'] }}</small>
                        </div>

                        <div class="area-box">
                            {{ $package['area_text'] }}
                        </div>

                        <div class="meta">
                            <div class="meta-line">
                                Thời hạn: <b>{{ $package['duration'] }}</b>
                            </div>
                            <div class="meta-line">
                                Số địa bàn:
                                <b>{{ $package['area_limit'] === -1 ? 'Không giới hạn' : $package['area_limit'] . ' xã/phường' }}</b>
                            </div>
                        </div>

                        <ul class="benefits">
                            @foreach($package['benefits'] as $benefit)
                                <li>{{ $benefit }}</li>
                            @endforeach
                        </ul>

                        <button
                            type="button"
                            class="btn btn-primary choose-vip-btn"
                            onclick="createOrder('{{ $package['code'] }}', this)"
                            {{ $isLocked ? 'disabled' : '' }}
                            data-locked="{{ $isLocked ? '1' : '0' }}"
                        >
                            @if($isLocked)
                                Không thể chọn gói thấp hơn
                            @elseif($isCurrent)
                                Gia hạn / Nâng cấp tiếp
                            @else
                                Chọn {{ strtoupper($package['code']) }}
                            @endif
                        </button>
                    </div>
                </div>
            @endforeach
        </div>

    </div>
</div>

@include('components.footer')

<script>
    let isCreatingOrder = false;

    function setAllVipButtonsDisabled(disabled, text = null) {
        document.querySelectorAll('.choose-vip-btn').forEach(btn => {
            const isLocked = btn.dataset.locked === '1';

            if (isLocked) {
                btn.disabled = true;
                return;
            }

            btn.disabled = disabled;

            if (disabled && text) {
                if (!btn.dataset.oldText) {
                    btn.dataset.oldText = btn.innerText;
                }
                btn.innerText = text;
            } else if (!disabled && btn.dataset.oldText) {
                btn.innerText = btn.dataset.oldText;
            }
        });
    }

    function createOrder(vip, el) {
        if (isCreatingOrder) return;
        if (el.dataset.locked === '1') return;

        isCreatingOrder = true;
        setAllVipButtonsDisabled(true, 'Đang chuyển sang thanh toán...');

        axios.post('{{ route('vip.payment.order') }}', { vip: vip }, {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            }
        })
        .then(res => {
            const data = res.data;

            if (!data.success || !data.redirect_url) {
                throw new Error(data.message || 'Không tạo được đơn');
            }

            window.location.href = data.redirect_url;
        })
        .catch(err => {
            console.error(err);
            alert(err.response?.data?.message || err.message || 'Không tạo được đơn thanh toán');
            isCreatingOrder = false;
            setAllVipButtonsDisabled(false);
        });
    }
</script>

</body>
</html>