<!doctype html>
<html lang="en">

<head>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>ADMIN TÀI ĐỔ MAP</title>

    <link rel="stylesheet" href="{{ asset('ad/assets/vendor/bootstrap/css/bootstrap.min.css') }}">
    <link rel="stylesheet" href="{{ asset('ad/assets/vendor/fonts/fontawesome/css/fontawesome-all.css') }}">

    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #f1f5f9;
            font-family: 'Poppins', sans-serif;
        }

        /* SCROLLBAR */

        ::-webkit-scrollbar {
            width: 6px;
        }

        ::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border-radius: 10px;
        }

        /* SIDEBAR */

        .sidebar {

            width: 260px;
            height: 100vh;
            position: fixed;

            background: linear-gradient(180deg, #0f172a, #1e293b);

            color: white;

            transition: .3s;

            z-index: 1000;

            box-shadow: 4px 0 30px rgba(0, 0, 0, 0.2);

        }

        .sidebar.hide {
            margin-left: -260px;
        }

        .sidebar h3 {

            padding: 25px;
            font-weight: 600;
            font-size: 20px;

            border-bottom: 1px solid rgba(255, 255, 255, 0.08);

        }

        /* MENU */

        .sidebar a {

            display: flex;
            align-items: center;

            padding: 14px 22px;

            color: #cbd5e1;

            text-decoration: none;

            font-size: 15px;

            transition: .25s;

            border-left: 3px solid transparent;

        }

        .sidebar a:hover {

            background: #334155;

            padding-left: 28px;

            border-left: 3px solid #3b82f6;

            color: white;

        }

        .sidebar a.active {

            background: #334155;

            border-left: 3px solid #3b82f6;

            color: white;

        }

        .sidebar i {

            width: 25px;

        }

        /* NAVBAR */

        .navbar-custom {

            height: 65px;

            background: rgba(255, 255, 255, 0.9);

            backdrop-filter: blur(12px);

            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);

            padding-left: 270px;

            display: flex;

            align-items: center;

            transition: .3s;

        }

        .navbar-custom.full {
            padding-left: 20px;
        }

        /* MENU BUTTON */

        .menu-btn {

            font-size: 20px;

            cursor: pointer;

            margin-right: 20px;

            color: #111;

        }

        /* USER */

        .user-box {

            display: flex;

            align-items: center;

            gap: 12px;

            margin-left: auto;

        }

        .avatar {

            width: 40px;
            height: 40px;

            border-radius: 50%;

            background: linear-gradient(45deg, #3b82f6, #2563eb);

            color: white;

            display: flex;

            align-items: center;

            justify-content: center;

            font-weight: 600;

            box-shadow: 0 5px 15px rgba(59, 130, 246, .4);

        }

        /* CONTENT */

        .content {

            margin-left: 260px;

            padding: 30px;

            transition: .3s;

        }

        .content.full {
            margin-left: 0;
        }

        /* PAGE TITLE */

        .page-title {

            font-size: 26px;

            font-weight: 600;

            margin-bottom: 20px;

        }

        /* CARD */

        .card-box {

            background: white;

            border-radius: 14px;

            padding: 25px;

            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.06);

            animation: fadeIn .4s;

        }

        /* TABLE */

        .table {

            border-radius: 10px;

            overflow: hidden;

        }

        .table thead {

            background: #1e293b;

            color: white;

        }

        .table th {

            border: none;

        }

        .table td {

            vertical-align: middle;

        }

        /* BUTTON */

        .btn {

            border-radius: 8px;

            font-size: 14px;

        }

        /* TOAST */

        .toast-success {

            position: fixed;

            top: 90px;
            right: -300px;

            background: linear-gradient(45deg, #22c55e, #16a34a);

            color: white;

            padding: 16px 25px;

            border-radius: 10px;

            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.25);

            font-weight: 500;

            transition: .4s;

        }

        .toast-success.show {
            right: 25px;
        }

        /* LOADER */

        #loader {

            position: fixed;

            width: 100%;
            height: 100%;

            background: white;

            display: flex;

            justify-content: center;

            align-items: center;

            z-index: 9999;

        }

        .spinner {

            width: 60px;
            height: 60px;

            border-radius: 50%;

            border: 6px solid #e5e7eb;

            border-top: 6px solid #3b82f6;

            animation: spin 1s linear infinite;

        }

        @keyframes spin {
            100% {
                transform: rotate(360deg);
            }
        }

        @keyframes fadeIn {

            from {
                opacity: 0;
                transform: translateY(10px)
            }

            to {
                opacity: 1
            }

        }

        /* MOBILE */

        @media(max-width:768px) {

            .sidebar {
                margin-left: -260px;
            }

            .sidebar.show {
                margin-left: 0;
            }

            .content {
                margin-left: 0;
            }

            .navbar-custom {
                padding-left: 20px;
            }

        }
    </style>

</head>

<body>
@if(auth()->check())
<script>
    setInterval(async () => {
        try {
            const res = await fetch("{{ route('devices.checkSession') }}", {
                method: "GET",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                },
                credentials: "same-origin"
            });

            if (res.status === 401) {
                alert("Thiết bị này đã bị đăng xuất hoặc bị thu hồi.");
                window.location.href = "/login";
            }
        } catch (e) {
            console.log("Lỗi kiểm tra thiết bị:", e);
        }
    }, 5000);
</script>
@endif
    <!-- LOADER -->

    <div id="loader">
        <div class="spinner"></div>
    </div>

    <!-- SIDEBAR -->

    <div class="sidebar" id="sidebar">

        <h3>🚀 TDMAP ADMIN</h3>

        <a href="{{ route('admin.dashboard') }}" class="active">
            <i class="fas fa-home"></i> Dashboard
        </a>

        <a href="{{ route('admin.users.index') }}">
            <i class="fas fa-users"></i> Người dùng
        </a>

        <a href="{{ route('admin.mapfiles') }}">
            <i class="fas fa-map"></i> Quản lý file
        </a>
        <a href="{{ route('admin.vip.transactions.index') }}">
            <i class="fas fa-file"></i> Quản lý tài khoản vip
        </a>
        <a href="{{ route('devices.index') }}"> <i class="fas fa-phone"></i> Quản lý thiết bị</a>
        <a href="{{ url('/') }}">
            <i class="fas fa-chart-line"></i> Quay về Trang chủ
        </a>

        <!-- <a href="#">
            <i class="fas fa-cog"></i> Cài đặt
        </a> -->

    </div>

    <!-- NAVBAR -->

    <nav class="navbar-custom" id="navbar">

        <span class="menu-btn" onclick="toggleMenu()">
            <i class="fas fa-bars"></i>
        </span>

        <div class="user-box">

            <div class="avatar">
                {{ strtoupper(substr(Auth::user()->name, 0, 1)) }}
            </div>

            <b>{{ Auth::user()->name }}</b>

            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button class="btn btn-sm btn-danger ml-2">
                    Logout
                </button>
            </form>

        </div>

    </nav>

    <!-- CONTENT -->

    <div class="content" id="content">

        <div class="page-title">
            @yield('title')
        </div>

        <div class="card-box">

            @yield('content')

        </div>

    </div>

    <!-- TOAST -->

    @if(session('success'))

        <div id="toast-success" class="toast-success">

            ✔ {{ session('success') }}

        </div>

    @endif

    <script src="{{ asset('ad/assets/vendor/jquery/jquery-3.3.1.min.js') }}"></script>
    <script src="{{ asset('ad/assets/vendor/bootstrap/js/bootstrap.bundle.js') }}"></script>

    <script>

        /* MENU */

        function toggleMenu() {

            let sidebar = document.getElementById("sidebar")
            let content = document.getElementById("content")
            let navbar = document.getElementById("navbar")

            sidebar.classList.toggle("show")
            sidebar.classList.toggle("hide")

            content.classList.toggle("full")
            navbar.classList.toggle("full")

        }

        /* LOADER */

        window.addEventListener("load", function () {

            setTimeout(function () {

                document.getElementById("loader").style.display = "none"

            }, 700)

        })

        /* TOAST */

        @if(session('success'))

            let toast = document.getElementById("toast-success")

            setTimeout(function () {

                toast.classList.add("show")

            }, 200)

            setTimeout(function () {

                toast.classList.remove("show")

            }, 3200)

        @endif

    </script>

</body>

</html>