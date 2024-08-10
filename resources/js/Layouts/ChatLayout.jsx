import { usePage } from "@inertiajs/react";

const ChatLayout = ({ children }) => {
    const page = usePage();
    const conversations = page.props.conversations;
    const selectedConversation = page.props.selectedConvesation;
    console.log(conversations);
    console.log(selectedConversation);

    return (
        <>
            ChatLayout
            <div>{children}</div>
        </>
    );
}

export default ChatLayout;