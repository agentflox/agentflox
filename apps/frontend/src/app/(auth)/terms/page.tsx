import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="w-full max-w-3xl bg-white p-8 md:p-12 rounded-2xl shadow-xl">
            <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
            </Link>
            <h1 className="text-3xl font-bold mb-6 tracking-tight">Terms of Service</h1>

            <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 mb-4">
                    Last updated: January 2026
                </p>

                <p className="mb-4">
                    These Terms of Service ("Terms") constitute a legally binding agreement made between you,
                    whether personally or on behalf of an entity ("you") and Agentflox Inc. ("we," "us" or "our"),
                    concerning your access to and use of the Agentflox website as well as any other media form,
                    media channel, mobile website or mobile application related, linked, or otherwise connected thereto.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4">1. Agreement to Terms</h2>
                <p className="mb-4">
                    By accessing the Site, you agree that you have read, understood, and agree to be bound by all of these Terms of Service.
                    If you do not agree with all of these Terms of Service, then you are expressly prohibited from using the Site and you must discontinue use immediately.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4">2. Intellectual Property Rights</h2>
                <p className="mb-4">
                    Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4">3. User Representations</h2>
                <p className="mb-4">
                    By using the Site, you represent and warrant that:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>All registration information you submit will be true, accurate, current, and complete.</li>
                    <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                    <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                    <li>You are not a minor in the jurisdiction in which you reside.</li>
                </ul>
            </div>
        </div>
    );
}
