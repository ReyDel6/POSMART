<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class OrderConfirmMail extends Mailable
{
    use Queueable;

    public $order;

    public $store;

    public $items;

    public $isWalkIn;

    public function __construct($order, array $store, array $items, bool $isWalkIn = false)
    {
        $this->order    = $order;
        $this->store    = $store;
        $this->items    = $items;
        $this->isWalkIn = $isWalkIn;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: ($this->store['store_name'] ?? 'Toko') . ' - Pesanan Anda #' . $this->order->id);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.order-confirm');
    }
}