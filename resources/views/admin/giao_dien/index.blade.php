@extends('admin.layout.header')

@section('title', 'Trang chủ')

@section('content')
<div class="dashboard-wrapper">
    <div class="container-fluid dashboard-content">

        <div class="row">
            <div class="col-12">
                <div class="page-header">
                    <h2 class="pageheader-title">Tổng quan hệ thống</h2>
                    <p class="pageheader-text">Thống kê người dùng, file tải lên, VIP và doanh thu.</p>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Tổng người đăng ký -->
            <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 col-12">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="text-muted mb-2">Người đăng ký</h5>
                                <h2 class="mb-0">{{ number_format($totalUsers) }}</h2>
                            </div>
                            <div class="dashboard-icon bg-primary-light">
                                <i class="fas fa-users text-primary"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tổng file tải lên -->
            <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 col-12">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="text-muted mb-2">File tải lên</h5>
                                <h2 class="mb-0">{{ number_format($totalUploads) }}</h2>
                            </div>
                            <div class="dashboard-icon bg-success-light">
                                <i class="fas fa-file-upload text-success"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Người dùng VIP -->
            <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 col-12">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="text-muted mb-2">Người dùng VIP</h5>
                                <h2 class="mb-0">{{ number_format($totalVipUsers) }}</h2>
                            </div>
                            <div class="dashboard-icon bg-warning-light">
                                <i class="fas fa-crown text-warning"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tổng doanh thu -->
            <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 col-12">
                <div class="card dashboard-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="text-muted mb-2">Tổng doanh thu</h5>
                                <h2 class="mb-0">{{ number_format($totalRevenue, 0, ',', '.') }} đ</h2>
                            </div>
                            <div class="dashboard-icon bg-danger-light">
                                <i class="fas fa-money-bill-wave text-danger"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- BIỂU ĐỒ TỔNG HỢP -->
        <div class="row">
            <div class="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-12">
                <div class="card">
                    <h5 class="card-header">Biểu đồ tổng hợp 12 tháng gần nhất</h5>
                    <div class="card-body">
                        <div id="mainChart" style="height: 420px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4 biểu đồ nhỏ -->
        <div class="row">
            <div class="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
                <div class="card">
                    <h5 class="card-header">Người đăng ký theo tháng</h5>
                    <div class="card-body">
                        <div id="userChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>

            <div class="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
                <div class="card">
                    <h5 class="card-header">File tải lên theo tháng</h5>
                    <div class="card-body">
                        <div id="uploadChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>

            <div class="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
                <div class="card">
                    <h5 class="card-header">Giao dịch VIP theo tháng</h5>
                    <div class="card-body">
                        <div id="vipChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>

            <div class="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
                <div class="card">
                    <h5 class="card-header">Doanh thu theo tháng</h5>
                    <div class="card-body">
                        <div id="revenueChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>

<style>
.dashboard-card{
    border: none;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    transition: all .25s ease;
}
.dashboard-card:hover{
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.12);
}
.dashboard-icon{
    width: 58px;
    height: 58px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}
.bg-primary-light{ background: rgba(0,123,255,.12); }
.bg-success-light{ background: rgba(40,167,69,.12); }
.bg-warning-light{ background: rgba(255,193,7,.18); }
.bg-danger-light{ background: rgba(220,53,69,.12); }

.pageheader-title{
    font-weight: 700;
    margin-bottom: 5px;
}
.pageheader-text{
    color: #6c757d;
    margin-bottom: 25px;
}
.card{
    border-radius: 16px;
    border: none;
    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
}
.card-header{
    background: #fff;
    border-bottom: 1px solid #eee;
    font-weight: 700;
}
</style>

<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
<script>
    const months = @json($months);
    const userChartData = @json($userChart);
    const uploadChartData = @json($uploadChart);
    const vipChartData = @json($vipChart);
    const revenueChartData = @json($revenueChart);

    // Biểu đồ tổng hợp
    new ApexCharts(document.querySelector("#mainChart"), {
        chart: {
            type: 'line',
            height: 420,
            toolbar: { show: true }
        },
        series: [
            {
                name: 'Người đăng ký',
                type: 'line',
                data: userChartData
            },
            {
                name: 'File tải lên',
                type: 'line',
                data: uploadChartData
            },
            {
                name: 'VIP',
                type: 'line',
                data: vipChartData
            },
            {
                name: 'Doanh thu',
                type: 'column',
                data: revenueChartData
            }
        ],
        stroke: {
            width: [3, 3, 3, 0]
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: months
        },
        yaxis: [
            {
                title: { text: 'Số lượng' }
            },
            {
                opposite: true,
                title: { text: 'Doanh thu (đ)' }
            }
        ],
        legend: {
            position: 'top'
        }
    }).render();

    // Biểu đồ user
    new ApexCharts(document.querySelector("#userChart"), {
        chart: { type: 'area', height: 300 },
        series: [{ name: 'Người đăng ký', data: userChartData }],
        xaxis: { categories: months },
        dataLabels: { enabled: false }
    }).render();

    // Biểu đồ upload
    new ApexCharts(document.querySelector("#uploadChart"), {
        chart: { type: 'bar', height: 300 },
        series: [{ name: 'File tải lên', data: uploadChartData }],
        xaxis: { categories: months },
        dataLabels: { enabled: false }
    }).render();

    // Biểu đồ VIP
    new ApexCharts(document.querySelector("#vipChart"), {
        chart: { type: 'line', height: 300 },
        series: [{ name: 'Giao dịch VIP', data: vipChartData }],
        xaxis: { categories: months },
        dataLabels: { enabled: false }
    }).render();

    // Biểu đồ doanh thu
    new ApexCharts(document.querySelector("#revenueChart"), {
        chart: { type: 'bar', height: 300 },
        series: [{ name: 'Doanh thu', data: revenueChartData }],
        xaxis: { categories: months },
        dataLabels: { enabled: false },
        yaxis: {
            labels: {
                formatter: function(value) {
                    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
                }
            }
        }
    }).render();
</script>
@endsection