"use client"
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';
import { storageUtils } from "@/utils/storage/storageUtils";
import {
    Loader2,
    Globe,
    ShieldCheck,
    Camera,
    AtSign,
    Pencil,
    Share2
} from 'lucide-react';
import { FaLinkedin, FaTwitter, FaFacebook, FaInstagram } from 'react-icons/fa';
import { DescriptionEditor } from '@/entities/shared/components/DescriptionEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE_MB = 5;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const USERNAME_REGEX = /^[a-zA-Z0-9_ ]+$/;

export function ProfileView() {
    const { data: session, isLoading: isLoadingSession } = trpc.user.me.useQuery();
    const { data: profileVisibility } = trpc.settings.getProfileVisibility.useQuery();
    const utils = trpc.useUtils();
    const { toast } = useToast();
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [twitterUrl, setTwitterUrl] = useState('');
    const [facebookUrl, setFacebookUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [headline, setHeadline] = useState('');
    const [avatar, setAvatar] = useState('');
    const [avatarPath, setAvatarPath] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const initializedUserIdRef = useRef<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!session?.id) return;
        if (initializedUserIdRef.current === session.id) return;

        initializedUserIdRef.current = session.id;
        setUsername(session.username || '');
        setBio(session.bio || '');
        setWebsite(session.website || '');
        setLinkedinUrl(session.linkedinUrl || '');
        setTwitterUrl(session.twitterUrl || '');
        setFacebookUrl(session.facebookUrl || '');
        setInstagramUrl(session.instagramUrl || '');
        setHeadline(session.headline || '');
        setAvatar(session.avatar || '');
    }, [session]);

    useEffect(() => {
        if (profileVisibility) {
            setIsPublic(profileVisibility === 'PUBLIC');
        }
    }, [profileVisibility]);

    const { mutate: updateProfile, isPending } = trpc.user.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Profile updated', description: 'Your public profile is now saved.' });
            utils.user.me.invalidate();
            utils.profile.getSinglePublicProfile.invalidate();
            setIsEditingBio(false);
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    const { mutate: updateProfileVisibility, isPending: isUpdatingVisibility } = trpc.settings.updateProfileVisibility.useMutation({
        onSuccess: (_, variables) => {
            const publicMode = variables.profileVisibility === 'PUBLIC';
            setIsPublic(publicMode);
            toast({
                title: publicMode ? 'Profile is public' : 'Profile is private',
                description: publicMode
                    ? 'Anyone can now view and share your profile.'
                    : 'Only you can view your profile link.'
            });
            utils.settings.getProfileVisibility.invalidate();
            utils.profile.getSinglePublicProfile.invalidate();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    const handleSave = () => {
        if (!session) return;
        const usernameValue = username.trim();

        if (usernameValue.length < 3 || usernameValue.length > 30 || !USERNAME_REGEX.test(usernameValue)) {
            toast({
                title: 'Invalid public alias',
                description: 'Use 3-30 characters: letters, numbers, spaces, or underscore only.',
                variant: 'destructive',
            });
            return;
        }

        updateProfile({
            username: usernameValue,
            bio,
            website: website.trim() || null,
            linkedinUrl: linkedinUrl.trim() || null,
            twitterUrl: twitterUrl.trim() || null,
            facebookUrl: facebookUrl.trim() || null,
            instagramUrl: instagramUrl.trim() || null,
            headline: headline.trim() || null,
            avatar: avatar || null,
        });
    };

    const handlePublicToggle = (nextPublic: boolean) => {
        updateProfileVisibility({
            profileVisibility: nextPublic ? 'PUBLIC' : 'PRIVATE',
        });
    };

    const handleShare = async () => {
        if (!session?.id) return;
        const profileUrl = `${window.location.origin}/profiles/${session.id}`;
        await navigator.clipboard.writeText(profileUrl);
        toast({ title: 'Link copied', description: 'Your profile URL is copied to clipboard.' });
    };

    const validateAvatarFile = (file: File): boolean => {
        if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: `Please upload an image file (JPG, PNG, WebP)`,
                variant: "destructive",
            });
            return false;
        }

        const maxSizeBytes = MAX_AVATAR_SIZE_MB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            toast({
                title: "File too large",
                description: `Please upload an image smaller than ${MAX_AVATAR_SIZE_MB}MB`,
                variant: "destructive",
            });
            return false;
        }

        return true;
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateAvatarFile(file)) return;

        setIsUploadingAvatar(true);

        try {
            const newPath = storageUtils.generateUniquePath(file.name, "avatars");

            let result;

            // If there's an existing avatar, replace it
            if (avatarPath) {
                result = await storageUtils.replace({
                    file,
                    bucket: AVATAR_BUCKET,
                    path: newPath,
                });
            } else {
                result = await storageUtils.upload({
                    file,
                    bucket: AVATAR_BUCKET,
                    path: newPath,
                });
            }

            if (result.success && result.url) {
                setAvatar(result.url);
                setAvatarPath(newPath);

                toast({
                    title: "Avatar uploaded",
                    description: "Your new avatar is ready. Don't forget to save changes.",
                });
            } else {
                toast({
                    title: "Upload failed",
                    description: result.error || "Failed to upload avatar",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const initials = (session?.name || session?.username || 'U')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('');

    const usernameValue = username.trim();
    const hasValidUsername = usernameValue.length > 0;
    const canSave = hasValidUsername;

    if (isLoadingSession) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            {/* Header Area */}
            <div className="space-y-1.5">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
                    Profile Settings
                </h1>
                <p className="text-slate-600 text-sm">
                    Manage your public persona, social links, and visibility preferences.
                </p>
            </div>

            {/* Main Profile Card */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md">

                {/* Banner Gradient */}
                <div className="h-32 w-full bg-gradient-to-r from-indigo-100 via-purple-50 to-emerald-50 relative" />

                <div className="px-6 pb-6">
                    {/* Avatar & Top Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8">

                        {/* Hoverable Avatar */}
                        <div className="-mt-12 relative group z-10">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-white shadow-lg cursor-pointer transition-transform duration-200 group-hover:scale-105",
                                    isUploadingAvatar && "pointer-events-none opacity-80"
                                )}
                            >
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={avatar || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-zinc-100 text-2xl font-semibold text-zinc-600">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Dark Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {isUploadingAvatar ? (
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    ) : (
                                        <>
                                            <Camera className="h-6 w-6 text-white mb-1" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Upload</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                                onChange={handleAvatarFileChange}
                            />
                        </div>

                        {/* Visibility & Share Actions */}
                        <div className="mt-4 sm:mt-0 flex items-center gap-3">
                            {/* Public/Private Toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2.5 rounded-full border border-zinc-200 bg-zinc-50/50 px-4 py-2 transition-colors hover:bg-zinc-50 cursor-pointer">
                                        <ShieldCheck className={cn("h-4 w-4", isPublic ? "text-emerald-500" : "text-zinc-400")} />
                                        <span className="text-sm font-medium text-zinc-700">
                                            {isPublic ? 'Public' : 'Private'}
                                        </span>
                                        <div className="ml-2 h-4 w-px bg-zinc-200" />
                                        <Switch
                                            checked={isPublic}
                                            disabled={isUpdatingVisibility}
                                            onCheckedChange={handlePublicToggle}
                                            className="data-[state=checked]:bg-emerald-500 cursor-pointer"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {isPublic ? 'Make profile private' : 'Make profile public'}
                                </TooltipContent>
                            </Tooltip>

                            {/* Share Button - Only visible when public */}
                            {isPublic && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleShare}
                                            className="h-9 w-9 p-0 hover:bg-zinc-200 transition-colors cursor-pointer"
                                        >
                                            <Share2 className="h-4 w-4 text-zinc-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Share profile link</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid gap-8">
                        {/* Username Input */}
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="username" className="text-sm font-medium text-zinc-700">
                                Public Alias <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                <AtSign className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <Input
                                    id="username"
                                    placeholder="username"
                                    variant="ghost"
                                    className="w-full h-11 pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                    value={username}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        const sanitized = raw.replace(/[^a-zA-Z0-9_ ]/g, '');
                                        setUsername(sanitized);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 max-w-2xl">
                            <Label htmlFor="headline" className="text-sm font-medium text-zinc-700">
                                Headline
                            </Label>
                            <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                <Input
                                    id="headline"
                                    placeholder="e.g. Product Designer | Building useful things"
                                    variant="ghost"
                                    className="w-full h-11 px-1 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                    value={headline}
                                    onChange={e => setHeadline(e.target.value)}
                                    maxLength={200}
                                />
                            </div>
                        </div>

                        {/* Bio Editor */}
                        <div className="space-y-2">
                            <Label htmlFor="bio" className="text-sm font-medium text-zinc-700">
                                Professional Bio
                            </Label>

                            {isEditingBio ? (
                                <div className="overflow-hidden rounded-lg border-2 border-indigo-400 bg-white transition-all">
                                    <div className="p-3">
                                        <DescriptionEditor
                                            content={bio}
                                            onChange={setBio}
                                            editable
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-3 py-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingBio(false)}
                                            className="h-8 text-xs cursor-pointer"
                                        >
                                            Done
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setIsEditingBio(true)}
                                    className="group relative overflow-hidden rounded-lg border-2 border-zinc-200 bg-zinc-50/50 p-4 transition-all cursor-text hover:border-zinc-300 hover:bg-white"
                                >
                                    {bio ? (
                                        <div
                                            className="prose prose-sm max-w-none text-zinc-700"
                                            dangerouslySetInnerHTML={{ __html: bio }}
                                        />
                                    ) : (
                                        <p className="text-sm text-zinc-400">Click to add your professional bio...</p>
                                    )}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pencil className="h-4 w-4 text-zinc-400" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Social Links */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="website" className="text-sm font-medium text-zinc-700">Website</Label>
                                <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                    <Globe className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input
                                        id="website"
                                        placeholder="https://your-site.com"
                                        variant="ghost"
                                        className="w-full h-11 pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                        value={website}
                                        onChange={e => setWebsite(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="linkedin" className="text-sm font-medium text-zinc-700">LinkedIn</Label>
                                <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                    <FaLinkedin className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input
                                        id="linkedin"
                                        placeholder="https://linkedin.com/in/handle"
                                        variant="ghost"
                                        className="w-full h-11 pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                        value={linkedinUrl}
                                        onChange={e => setLinkedinUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="twitter" className="text-sm font-medium text-zinc-700">Twitter/X</Label>
                                <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                    <FaTwitter className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input
                                        id="twitter"
                                        placeholder="https://x.com/handle"
                                        variant="ghost"
                                        className="w-full h-11 pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                        value={twitterUrl}
                                        onChange={e => setTwitterUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facebook" className="text-sm font-medium text-zinc-700">Facebook</Label>
                                <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                    <FaFacebook className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input
                                        id="facebook"
                                        placeholder="https://facebook.com/username"
                                        variant="ghost"
                                        className="w-full h-11 pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                        value={facebookUrl}
                                        onChange={e => setFacebookUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="instagram" className="text-sm font-medium text-zinc-700">Instagram</Label>
                                <div className="relative flex items-center rounded-lg border-2 border-zinc-200 bg-zinc-50/50 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                                    <FaInstagram className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                    <Input
                                        id="instagram"
                                        placeholder="https://instagram.com/username"
                                        variant="ghost"
                                        className="w-full h-11 pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 bg-transparent text-[15px]"
                                        value={instagramUrl}
                                        onChange={e => setInstagramUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
                    <Button
                        onClick={handleSave}
                        disabled={isPending || isUploadingAvatar || !canSave}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer px-6"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}