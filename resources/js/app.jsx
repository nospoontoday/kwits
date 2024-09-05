import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { EventBusProvider } from './EventBus';
import { useEffect } from 'react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Custom component to handle viewport height adjustment
const ViewportHandler = ({ children }) => {
    useEffect(() => {
        // Function to reset the body height and set the --vh variable
        const handleResize = () => {
            // Set the custom vh CSS variable based on window's inner height
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);

            // Reset the body height to the window's inner height
            document.body.style.height = `${window.innerHeight}px`;
        };

        // Set height on initial load
        handleResize();

        // Listen for window resize events
        window.addEventListener('resize', handleResize);

        return () => {
            // Clean up the event listener on component unmount
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <>{children}</>;
};

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <EventBusProvider>
                <ViewportHandler>
                    <App {...props} />
                </ViewportHandler>
            </EventBusProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
