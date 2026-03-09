import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState, AppDispatch } from '@/stores/store';
import {
    setLanguage,
    setShowAgentIcon,
    setShowMessageIcon,
    setCommandInterfaceOpen,
} from '@/stores/slices/interfaceSettings.slice';

export function useInterfaceSettings() {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();

    const {
        language,
        showAgentIcon,
        showMessageIcon,
        commandInterfaceOpen,
    } = useSelector((state: RootState) => state.interfaceSettings);

    // Sync Redux language state with i18next
    useEffect(() => {
        if (language && i18n.language !== language) {
            i18n.changeLanguage(language);
        }
    }, [language, i18n]);

    // Sync i18next language changes back to Redux
    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            if (lng !== language) {
                dispatch(setLanguage(lng));
            }
        };

        i18n.on('languageChanged', handleLanguageChange);
        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [dispatch, i18n, language]);

    return {
        language,
        setLanguage: (lang: string) => {
            dispatch(setLanguage(lang));
            i18n.changeLanguage(lang);
        },
        showAgentIcon,
        setShowAgentIcon: (show: boolean) => dispatch(setShowAgentIcon(show)),
        showMessageIcon,
        setShowMessageIcon: (show: boolean) => dispatch(setShowMessageIcon(show)),
        commandInterfaceOpen,
        setCommandInterfaceOpen: (open: boolean) => dispatch(setCommandInterfaceOpen(open)),
        t, // i18next translation function
    };
}
