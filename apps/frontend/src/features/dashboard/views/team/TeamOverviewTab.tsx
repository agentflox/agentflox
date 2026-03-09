"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserCard from "@/entities/users/components/UserCard";
import Link from "next/link";
import {
    Users,
    UserPlus,
    GraduationCap,
    TrendingUp,
    Handshake,
    ShoppingBag,
    LayoutGrid
} from "lucide-react";
import { DASHBOARD_ROUTES } from "@/constants/routes.config";

const teamTabs = [
    {
        key: 'overview',
        label: 'Overview',
        icon: <LayoutGrid className="h-4 w-4" />,
    },
    {
        key: 'teams',
        label: 'Teams',
        icon: <Users className="h-4 w-4" />,
    },
    {
        key: 'cofounders',
        label: 'Co-Founders',
        icon: <UserPlus className="h-4 w-4" />,
    },
    {
        key: 'mentors',
        label: 'Mentors',
        icon: <GraduationCap className="h-4 w-4" />,
    },
    {
        key: 'investors',
        label: 'Investors',
        icon: <TrendingUp className="h-4 w-4" />,
    },
    {
        key: 'partners',
        label: 'Partners',
        icon: <Handshake className="h-4 w-4" />,
    },
    {
        key: 'customers',
        label: 'Customers',
        icon: <ShoppingBag className="h-4 w-4" />,
    },
];

export function TeamOverviewTab({ team }: { team: any }) {
    if (!team) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-sm text-muted-foreground">No team data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Tabs Section */}
            <Tabs defaultValue="overview" className="w-full">
                {/* Horizontal Scrolling Tabs with Better Visibility */}
                <div className="relative -mx-2 sm:mx-0">
                    <TabsList className="w-full inline-flex sm:flex justify-start bg-slate-800 border border-slate-600 rounded-lg sm:rounded-xl h-auto p-1 overflow-x-auto sm:overflow-visible overflow-y-hidden">
                        <div className="flex gap-1 md:flex-wrap min-w-max sm:min-w-0 sm:w-full px-1">
                            {teamTabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 sm:px-4 py-2.5 sm:py-3 text-slate-300 bg-transparent hover:bg-slate-700/50 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 transition-all duration-200 font-medium"
                                >
                                    <span className="flex-shrink-0">{tab.icon}</span>
                                    <span className="text-xs sm:text-sm font-semibold">{tab.label}</span>
                                </TabsTrigger>
                            ))}
                        </div>
                    </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                    {/* Hero Section with Team Vision */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                        {/* Team Vision Card */}
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white overflow-hidden">
                            <CardContent className="p-4 sm:p-6">
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-blue-400">Team Vision</span>
                                    </div>

                                    <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                                        {team.name || "Empowering the Future of Development"}
                                    </h2>

                                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                        {team.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
                                    </p>

                                    {/* Decorative 3D Illustration Placeholder */}
                                    <div className="mt-4 sm:mt-6 h-40 sm:h-48 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                                        <div className="text-center">
                                            <LayoutGrid className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mx-auto mb-2" />
                                            <p className="text-xs text-slate-500">Team Visualization</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Key Metrics & Quick Info */}
                        <div className="space-y-3 sm:space-y-4">
                            {/* Key Metrics */}
                            <Card className="bg-slate-900 border-slate-700">
                                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                                    <CardTitle className="text-sm sm:text-base text-white">Key Metrics</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        <div className="text-center">
                                            <div className="relative inline-flex items-center justify-center">
                                                <svg className="h-16 w-16 sm:h-20 sm:w-20 transform -rotate-90">
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="none"
                                                        className="text-slate-700 sm:hidden"
                                                    />
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 28}`}
                                                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.9)}`}
                                                        className="text-cyan-400 sm:hidden"
                                                        strokeLinecap="round"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="none"
                                                        className="text-slate-700 hidden sm:block"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 32}`}
                                                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - 0.9)}`}
                                                        className="text-cyan-400 hidden sm:block"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <span className="absolute text-base sm:text-lg font-bold text-white">90%</span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Funding 90%</p>
                                        </div>

                                        <div className="text-center">
                                            <div className="relative inline-flex items-center justify-center">
                                                <svg className="h-16 w-16 sm:h-20 sm:w-20 transform -rotate-90">
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="none"
                                                        className="text-slate-700 sm:hidden"
                                                    />
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 28}`}
                                                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.9)}`}
                                                        className="text-cyan-400 sm:hidden"
                                                        strokeLinecap="round"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="none"
                                                        className="text-slate-700 hidden sm:block"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 32}`}
                                                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - 0.9)}`}
                                                        className="text-cyan-400 hidden sm:block"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <span className="absolute text-base sm:text-lg font-bold text-white">90%</span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Stage Beta Launch</p>
                                        </div>

                                        <div className="text-center">
                                            <div className="relative inline-flex items-center justify-center">
                                                <svg className="h-16 w-16 sm:h-20 sm:w-20 transform -rotate-90">
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="none"
                                                        className="text-slate-700 sm:hidden"
                                                    />
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="5"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 28}`}
                                                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.5)}`}
                                                        className="text-slate-500 sm:hidden"
                                                        strokeLinecap="round"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="none"
                                                        className="text-slate-700 hidden sm:block"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="32"
                                                        stroke="currentColor"
                                                        strokeWidth="6"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 32}`}
                                                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - 0.5)}`}
                                                        className="text-slate-500 hidden sm:block"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <span className="absolute text-base sm:text-lg font-bold text-white">50%</span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">Timeline Q4 2024</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Updates */}
                            <Card className="bg-slate-900 border-slate-700">
                                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                                    <CardTitle className="text-sm sm:text-base text-white">Recent Updates</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                                    <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                                        <li className="flex items-start gap-2">
                                            <span className="text-cyan-400 mt-1 flex-shrink-0">•</span>
                                            <span>2021-1.6 fixed 2021</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-cyan-400 mt-1 flex-shrink-0">•</span>
                                            <span>2013 $ 80 on the la frus touunert</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-cyan-400 mt-1 flex-shrink-0">•</span>
                                            <span>Da rte & se se on th ay ad age of share sas ting fit mpolity houenm and alns out</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Quick Links */}
                            <Card className="bg-slate-900 border-slate-700">
                                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                                    <CardTitle className="text-sm sm:text-base text-white">Quick Links</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                                        <button className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap">
                                            View Full Report
                                        </button>
                                        <button className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap">
                                            Meet the Team
                                        </button>
                                        <button className="px-3 sm:px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap">
                                            Contact Us
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Teams Tab */}
                <TabsContent value="teams" className="mt-4 sm:mt-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
                            {team?.teamId && (
                                <Link
                                    href={DASHBOARD_ROUTES.TEAM(team.teamId)}
                                    className="text-xs sm:text-sm text-cyan-600 hover:text-cyan-700 hover:underline font-medium"
                                >
                                    View full team →
                                </Link>
                            )}
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                            {team?.teams && team.teams.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {team.teams.map((m: any) => (
                                        <UserCard
                                            key={m.id}
                                            id={m.id}
                                            title={m.name}
                                            subtitle={m.role}
                                            href={DASHBOARD_ROUTES.PROFILES(m.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No team members added yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Co-Founders Tab */}
                <TabsContent value="cofounders" className="mt-4 sm:mt-6">
                    <Card>
                        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-base sm:text-lg">Co-Founders</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                            {team?.cofounders && team.cofounders.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {team.cofounders.map((m: any) => (
                                        <UserCard
                                            key={m.id}
                                            id={m.id}
                                            title={m.name}
                                            subtitle={m.title}
                                            href={DASHBOARD_ROUTES.PROFILES(m.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No co-founders added yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Mentors Tab */}
                <TabsContent value="mentors" className="mt-4 sm:mt-6">
                    <Card>
                        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-base sm:text-lg">Mentors</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                            {team?.mentors && team.mentors.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {team.mentors.map((m: any) => (
                                        <UserCard
                                            key={m.id}
                                            id={m.id}
                                            title={m.name}
                                            subtitle={m.expertise}
                                            href={DASHBOARD_ROUTES.PROFILES(m.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No mentors added yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Investors Tab */}
                <TabsContent value="investors" className="mt-4 sm:mt-6">
                    <Card>
                        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-base sm:text-lg">Investors</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                            {team?.investors && team.investors.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {team.investors.map((m: any) => (
                                        <UserCard
                                            key={m.id}
                                            id={m.id}
                                            title={m.name}
                                            subtitle={m.firm || m.type}
                                            href={DASHBOARD_ROUTES.PROFILES(m.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No investors added yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Partners Tab */}
                <TabsContent value="partners" className="mt-4 sm:mt-6">
                    <Card>
                        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-base sm:text-lg">Partners</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                            {team?.partners && team.partners.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {team.partners.map((m: any) => (
                                        <UserCard
                                            key={m.id}
                                            id={m.id}
                                            title={m.name}
                                            subtitle={m.type}
                                            href={DASHBOARD_ROUTES.PROFILES(m.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No partners added yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Customers Tab */}
                <TabsContent value="customers" className="mt-4 sm:mt-6">
                    <Card>
                        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                            <CardTitle className="text-base sm:text-lg">Customers</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                            {team?.customers && team.customers.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {team.customers.map((m: any) => (
                                        <UserCard
                                            key={m.id}
                                            id={m.id}
                                            title={m.name}
                                            subtitle={m.segment}
                                            href={DASHBOARD_ROUTES.PROFILES(m.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">No customers added yet</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}
