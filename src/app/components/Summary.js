'use client'
import { useChat } from 'ai/react';

export function Summary() {
    const { messages, input, handleInputChange,  handleSubmit } = useChat();


    return (
        <div>
            {
                messages.map(message => (
                    <div key={message.id}>
                        <p>{message.content}</p>
                    </div>
                ))
            }

            <form onSubmit={handleSubmit}>
                <input type="text" name="urlVideoYoutube" onChange={handleInputChange} />
                <button type="submit">Enviar</button>
            </form>
        </div>
    );
}
