<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Tài Đỗ Map')</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">
    <link rel="stylesheet" href="{{ asset('css/header.css') }}">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="manifest" href="{{ asset('manifest.json') }}">
<meta name="theme-color" content="#0d6efd">
<link rel="apple-touch-icon" href="{{ asset('images/logo-192.png') }}">
    @stack('styles')
</head>
<body>

    @include('partials.header')

    @yield('content')

    @stack('scripts')


    <script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered: ', registration);
            })
            .catch(function(error) {
                console.log('SW registration failed: ', error);
            });
    });
}
</script>
</body>
</html>