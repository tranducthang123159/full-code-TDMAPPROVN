<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\VipMapFile;
use Illuminate\Support\Facades\Auth;

class VipUploadController extends Controller
{
public function upload(Request $request)
{

$user = Auth::user();

/* kiểm tra VIP */

if($user->vip_level == 0){

return response()->json([
'success'=>false,
'message'=>"Cần nâng cấp VIP"
]);

}

/* limit */

$limit = 0;

if($user->vip_level == 1) $limit = 1;
if($user->vip_level == 2) $limit = 6;

$count = VipMapFile::where('user_id',$user->id)->count();

if($limit != 0 && $count >= $limit){

return response()->json([
'success'=>false,
'message'=>"Bạn đã hết lượt upload của VIP"
]);

}

/* upload */

$file = $request->file('file');

$name = $file->getClientOriginalName();

$size = $file->getSize();

$path = $file->store('vip_geojson','public');

VipMapFile::create([

'user_id'=>$user->id,
'type'=>$request->type,
'file_name'=>$name,
'file_path'=>$path,
'file_size'=>$size

]);

return response()->json([
'success'=>true
]);

}




}