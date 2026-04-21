<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PolicyController extends Controller
{
    public function privacy()
    {
        return view('policy.privacy');
    }

    public function terms()
    {
        return view('policy.terms');
    }

    public function payment()
    {
        return view('policy.payment');
    }

    public function refund()
    {
        return view('policy.refund');
    }

    public function gisData()
    {
        return view('policy.gis-data');
    }

    public function contact()
    {
        return view('policy.contact');
    }
}