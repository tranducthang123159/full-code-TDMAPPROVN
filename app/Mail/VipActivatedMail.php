<?php

namespace App\Mail;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VipActivatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Transaction $transaction;
    public User $user;

    public function __construct(Transaction $transaction, User $user)
    {
        $this->transaction = $transaction;
        $this->user = $user;
    }

    public function build()
    {
        return $this->subject('Gói VIP của bạn đã được kích hoạt')
            ->view('emails.vip-activated');
    }
}