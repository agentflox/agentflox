"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { GraduationCap, BookOpen, Users, BrainCircuit, FileSearch, Library } from "lucide-react";

export default function EducationPage() {
    return (
        <FeaturePageLayout
            badge="For Education"
            title="Personalized Learning at Scale"
            description="Give every student a dedicated 1:1 tutor. Empower educators with AI teaching assistants that handle grading and lesson planning."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="w-full max-w-sm bg-white rounded-lg shadow-xl overflow-hidden relative rotate-1 hover:rotate-0 transition-transform duration-500">
                        <div className="h-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
                        <div className="p-6">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                                <GraduationCap size={24} className="text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Student: Maya</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subject</span>
                                    <span className="font-semibold text-gray-900">Calculus II</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Progress</span>
                                    <span className="font-semibold text-green-600">Top 5%</span>
                                </div>
                                <div className="border-t border-gray-100 pt-3">
                                    <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Recommended Focus</div>
                                    <div className="bg-orange-50 text-orange-700 text-xs p-2 rounded">
                                        Practice Chain Rule applications.
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Floating Grade */}
                        <div className="absolute top-4 right-4 bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                            A+
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "AI Tutors",
                    description: "Available 24/7 to answer questions, explain concepts, and provide practice problems tailored to the student's level.",
                    icon: BrainCircuit
                },
                {
                    title: "Automated Grading",
                    description: "Instant feedback on essays and code. Agents highlight errors and suggest improvements, saving teachers hours per week.",
                    icon: FileSearch
                },
                {
                    title: "Curriculum Design",
                    description: "Generate lesson plans, quizzes, and slide decks instantly based on learning objectives and state standards.",
                    icon: Library
                }
            ]}
            stats={[
                { label: "Grade Improvement", value: "+1 Letter", subtext: "Average impact" },
                { label: "Teacher Time", value: "+10h/wk", subtext: "Saved on admin" },
                { label: "Engagement", value: "90%", subtext: "Student retention" }
            ]}
            deepDive={{
                title: "No Student Left Behind",
                description: "In a classroom of 30, it's impossible to track everyone. AI provides the granular attention needed to catch learning gaps early.",
                bullets: [
                    "Adaptive Learning: The curriculum adjusts difficulty in real-time based on student performance.",
                    "Language Support: Agents can explain concepts in the student's native language.",
                    "Administrative Aid: Automate attendance, parent emails, and scheduling."
                ]
            }}
        />
    );
}
