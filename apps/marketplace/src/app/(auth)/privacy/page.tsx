import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="w-full max-w-3xl bg-white p-8 md:p-12 rounded-2xl shadow-xl">
            <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
            </Link>

            <h1 className="text-3xl font-bold mb-6 tracking-tight">Privacy Policy</h1>

            <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 mb-4">
                    Last updated: January 2026
                </p>

                <p className="mb-4">
                    At Agentflox, we take your privacy seriously. This Privacy Policy explains how we collect, use,
                    disclose, and safeguard your information when you visit our website or use our services.
                    Please read this privacy policy carefully.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4">1. Collection of Information</h2>
                <p className="mb-4">
                    We may collect information about you in a variety of ways. The information we may collect on the Site includes:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number.</li>
                    <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
                </ul>

                <h2 className="text-xl font-bold mt-8 mb-4">2. Use of Your Information</h2>
                <p className="mb-4">
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Create and manage your account.</li>
                    <li>Process your payments and refunds.</li>
                    <li>Email you regarding your account or order.</li>
                    <li>Fulfil and manage purchases, orders, payments, and other transactions related to the Site.</li>
                </ul>
            </div>
        </div>
    );
}
