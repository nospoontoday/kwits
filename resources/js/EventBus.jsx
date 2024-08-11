import React from "react";

export const EventBusContext = React.createContext();

export const EventBusProvider = ({ children }) => {
    const [events, setEvents] = React.useState({});

    const emit = (name, data) => {
        if (events[name]) {
            for (let cb of events[name]) {
                cb(data);
            }
        }
    };

    const on = (name, cb) => {
        setEvents((prevEvents) => {
            const updatedEvents = { ...prevEvents };
            if (!updatedEvents[name]) {
                updatedEvents[name] = [];
            }
            updatedEvents[name].push(cb);
            return updatedEvents;
        });

        return () => {
            setEvents((prevEvents) => {
                const updatedEvents = { ...prevEvents };
                updatedEvents[name] = updatedEvents[name].filter((callback) => callback !== cb);
                return updatedEvents;
            });
        };
    };

    return (
        <EventBusContext.Provider value={{ emit, on }}>
            {children}
        </EventBusContext.Provider>
    );
};

export const useEventBus = () => {
    return React.useContext(EventBusContext);
};
