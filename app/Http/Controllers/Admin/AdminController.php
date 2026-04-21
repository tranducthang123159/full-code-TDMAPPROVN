<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MapFile;
use App\Models\Transaction;
use Carbon\Carbon;

class AdminController extends Controller
{
    public function index()
    {
        $totalUsers = User::count();
        $totalUploads = MapFile::count();

        $totalVipUsers = User::whereIn('vip_level', [1, 2, 3])
            ->where(function ($q) {
                $q->whereNull('vip_expired_at')
                  ->orWhere('vip_expired_at', '>=', now());
            })
            ->count();

        $totalRevenue = Transaction::where('status', 'completed')->sum('amount');

        $months = [];
        $userChart = [];
        $uploadChart = [];
        $vipChart = [];
        $revenueChart = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);

            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();

            $months[] = $date->format('m/Y');
            $userChart[] = User::whereBetween('created_at', [$start, $end])->count();
            $uploadChart[] = MapFile::whereBetween('created_at', [$start, $end])->count();
            $vipChart[] = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->count();
            $revenueChart[] = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->sum('amount');
        }

        return view('admin.giao_dien.index', compact(
            'totalUsers',
            'totalUploads',
            'totalVipUsers',
            'totalRevenue',
            'months',
            'userChart',
            'uploadChart',
            'vipChart',
            'revenueChart'
        ));
    }
}