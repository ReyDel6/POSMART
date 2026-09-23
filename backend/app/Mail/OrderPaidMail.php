<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderPaidMail extends Mailable
{
    use Queueable;

    public $order;

    public $store;

    public function __construct($order, array $store)
    {
        $this->order = $order;
        $this->store = $store;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Pembayaran Diterima - Pesanan #' . $this->order->id);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.order-paid');
    }
}