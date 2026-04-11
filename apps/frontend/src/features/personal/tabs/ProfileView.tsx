"use client"
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';
import { Loader2, UserCircle2 } from 'lucide-react';

export function ProfileView() {
    const { data: session, isLoading: isLoadingSession } = trpc.user.me.useQuery();
    const utils = trpc.useUtils();
    const { toast } = useToast();

    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [website, setWebsite] = useState('');

    useEffect(() => {
        if (session) {
            setUsername(session.username || '');
            setBio(session.bio || '');
            setLocation(session.location || '');
            setWebsite(session.website || '');
        }
    }, [session]);

    const { mutate: updateProfile, isPending } = trpc.user.update.useMutation({
        onSuccess: () => {
            toast({ title: 'Profile updated', description: 'Your public profile is now saved.' });
            utils.user.me.invalidate();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    const handleSave = () => {
        if (!session) return;
        updateProfile({
            username,
            bio,
            location,
            website
        });
    };

    if (isLoadingSession) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>;

    return (
        <div className="max-w-2xl space-y-8">
            <div className="space-y-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <UserCircle2 className="h-6 w-6 text-indigo-500" />
                    Marketplace Profile
                </h3>
                <p className="text-sm text-zinc-500">
                    Setup your public persona here. You need a bio and an alias to list entities on the Marketplace.
                </p>
            </div>

            <div className="space-y-6 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200">
                <div className="grid gap-2">
                    <Label htmlFor="username">Public Alias / Username <span className="text-rose-500">*</span></Label>
                    <Input 
                        id="username" 
                        placeholder="@username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                    />
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="bio">Professional Bio <span className="text-rose-500">*</span></Label>
                    <Textarea 
                        id="bio" 
                        placeholder="Tell the community what you excel at building..." 
                        rows={4}
                        value={bio} 
                        onChange={e => setBio(e.target.value)} 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input 
                            id="location" 
                            placeholder="San Francisco, CA" 
                            value={location} 
                            onChange={e => setLocation(e.target.value)} 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input 
                            id="website" 
                            placeholder="https://..." 
                            value={website} 
                            onChange={e => setWebsite(e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button 
                    onClick={handleSave} 
                    disabled={isPending || (!username.trim() || !bio.trim())}
                >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                </Button>
            </div>
        </div>
    );
}
