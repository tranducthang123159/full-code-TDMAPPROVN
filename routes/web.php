<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\PolicyController;
use App\Http\Controllers\VipController;
use App\Http\Controllers\VipUploadController;
use App\Http\Controllers\MapDataApiController;
use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\PayOSWebhookController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\MapAdminController;
use App\Http\Controllers\Admin\VipTransactionController;
use App\Http\Controllers\DeviceController;
/*
|--------------------------------------------------------------------------
| Trang chủ
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return view('index');
})->name('home');

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/
Route::get('/dashboard', function () {
    return view('index');
})->middleware(['auth', 'otp.active'])->name('dashboard');

/*
|--------------------------------------------------------------------------
| OTP VERIFY
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'otp.active'])->group(function () {
    Route::get('/verify-otp', [OtpController::class, 'form'])->name('otp.form');
    Route::post('/verify-otp', [OtpController::class, 'verify'])->name('otp.verify');
    Route::get('/resend-otp', [OtpController::class, 'resend'])->name('otp.resend');
});



Route::middleware(['auth'])->group(function () {
    Route::post('/upload-map-ticket', [MapController::class, 'createUploadTicket'])->name('map.upload-ticket');
    Route::post('/upload-map', [MapController::class, 'upload'])->name('map.upload');
});


Route::middleware(['auth', 'check.device'])->prefix('admin')->group(function () {
    Route::get('/thietbi', [DeviceController::class, 'index'])->name('devices.index');
    Route::post('/thietbi/{id}/deactivate', [DeviceController::class, 'deactivate'])->name('devices.deactivate');
    Route::post('/thietbi/{id}/revoke', [DeviceController::class, 'revoke'])->name('devices.revoke');
    Route::delete('/thietbi/{id}', [DeviceController::class, 'destroy'])->name('devices.destroy');
    Route::post('/thietbi/logout-all', [DeviceController::class, 'logoutAll'])->name('devices.logoutAll');
});

Route::middleware(['auth'])->get('/device/check-session', [DeviceController::class, 'checkSession'])->name('devices.checkSession');
/*
|--------------------------------------------------------------------------
| Profile
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'otp.active'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'otp.active', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', [AdminController::class, 'index'])->name('dashboard');

        Route::resource('users', UserController::class);

        Route::get('/mapfiles', [MapAdminController::class, 'index'])->name('mapfiles');
        Route::get('/mapfiles/download/{id}', [MapAdminController::class, 'download'])->name('mapfiles.download');

        Route::get('/vip-transactions', [VipTransactionController::class, 'index'])->name('vip.transactions.index');
        Route::post('/vip-transactions/{transaction}/confirm', [VipTransactionController::class, 'confirm'])->name('vip.transactions.confirm');
        Route::post('/vip-transactions/{transaction}/cancel', [VipTransactionController::class, 'cancel'])->name('vip.transactions.cancel');
    });



    Route::middleware(['auth', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {

      

        // Tải file map
        Route::get('/mapfiles/{id}/download', [MapAdminController::class, 'download'])
            ->name('mapfiles.download');

        // Xóa 1 file map
        Route::delete('/mapfiles/{id}', [MapAdminController::class, 'destroyFile'])
            ->name('mapfiles.destroy');

        // Gỡ xã của user: xóa toàn bộ file map thuộc xã đó + xóa user_area_scope
        Route::delete('/users/{userId}/areas/{areaCode}', [MapAdminController::class, 'removeArea'])
            ->name('users.areas.remove');
    });

/*
|--------------------------------------------------------------------------
| Map
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'otp.active'])->group(function () {
    Route::post('/upload-map', [MapController::class, 'upload'])->name('map.upload');

    Route::get('/my-files', [MapController::class, 'myFiles'])->name('map.myfiles');
    Route::get('/my-files-json', [MapController::class, 'myFilesJson'])->name('map.myfiles.json');

    Route::get('/map-files/{id}/json', [MapController::class, 'getGeoJson'])->name('map.files.json');
    Route::get('/map-files/{id}/file/{level}', [MapController::class, 'serveGeoJson'])->name('map.files.serve');
    Route::delete('/map-files/{id}', [MapController::class, 'delete'])->name('map.files.delete');

    Route::get('/download-map/{id}', [MapController::class, 'download'])->name('map.download');

    Route::get('/api/dvhc/provinces', [MapController::class, 'getProvinces'])->name('map.api.provinces');
    Route::get('/api/dvhc/areas', [MapController::class, 'getAreas'])->name('map.api.areas');
    Route::get('/api/my-area-scopes', [MapController::class, 'myAreaScopes'])->name('map.api.my-area-scopes');

    Route::get('/api/map-files/{id}/parcel-viewport-features', [MapDataApiController::class, 'parcelViewportFeatures'])->name('map.api.parcel-viewport-features');
    Route::post('/api/map-files/{id}/prepare-hosting-artifacts', [MapDataApiController::class, 'prepareHostingArtifacts'])->name('map.api.prepare-hosting-artifacts');
    Route::get('/api/map-files/{id}/parcel-search', [MapDataApiController::class, 'parcelSearch'])->name('map.api.parcel-search');
    Route::post('/api/map-files/{id}/parcel-feature-resolve', [MapDataApiController::class, 'resolveParcelFeature'])->name('map.api.parcel-feature-resolve');
    Route::post('/api/map-files/{id}/planning-candidates', [MapDataApiController::class, 'planningCandidates'])->name('map.api.planning-candidates');
    Route::post('/api/map-files/{id}/split-preview', [MapDataApiController::class, 'splitPreview'])->name('map.api.split-preview');
});

/*
|--------------------------------------------------------------------------
| VIP Payment
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    Route::get('/vip/payment', [VipController::class, 'paymentPage'])->name('vip.payment');
    Route::post('/vip/payment/order', [VipController::class, 'createOrder'])->name('vip.payment.order');
    Route::get('/vip/payment/order/{transactionId}', [VipController::class, 'showOrder'])->name('vip.payment.order.show');
    Route::get('/vip/payment/status/{transactionId}', [VipController::class, 'checkStatus'])->name('vip.payment.status');
    Route::post('/vip/payment/confirmed/{transactionId}', [VipController::class, 'userConfirmedPaid'])->name('vip.payment.confirmed');
});

/*
|--------------------------------------------------------------------------
| Upload VIP riêng
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::post('/upload-vip', [VipUploadController::class, 'upload'])->name('vip.upload');
});

/*
|--------------------------------------------------------------------------
| Chính sách
|--------------------------------------------------------------------------
*/
Route::prefix('chinh-sach')->name('policy.')->group(function () {
    Route::get('/bao-mat', [PolicyController::class, 'privacy'])->name('privacy');
    Route::get('/dieu-khoan', [PolicyController::class, 'terms'])->name('terms');
    Route::get('/thanh-toan', [PolicyController::class, 'payment'])->name('payment');
    Route::get('/hoan-tien', [PolicyController::class, 'refund'])->name('refund');
    Route::get('/du-lieu-gis', [PolicyController::class, 'gisData'])->name('gis-data');
    Route::get('/lien-he', [PolicyController::class, 'contact'])->name('contact');
});





/*
|--------------------------------------------------------------------------
| payOS
|--------------------------------------------------------------------------
*/
Route::post('/api/payos/webhook', [PayOSWebhookController::class, 'handle'])
    ->name('payos.webhook');

Route::get('/vip/payment/return', [PayOSWebhookController::class, 'return'])
    ->name('payos.return');

Route::get('/vip/payment/cancel', [PayOSWebhookController::class, 'cancel'])
    ->name('payos.cancel');
/*
|--------------------------------------------------------------------------
| Auth routes
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';