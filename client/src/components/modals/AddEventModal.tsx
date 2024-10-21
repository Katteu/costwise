import api from '@/utils/api';
import React, { useContext, useState } from 'react';
import { FaCalendarPlus } from "react-icons/fa";
import Spinner from '../loaders/Spinner';
import { useUserContext } from '@/contexts/UserContext';
import Alert from '../alerts/Alert';

type AddEventModalProps = {
    date: Date;
    onClose: () => void;
    onAddEvent: (event: { date: Date; title: string; description: string; startTime: string; endTime: string }) => void;
};

const AddEventModal: React.FC<AddEventModalProps> = ({ date, onClose, onAddEvent }) => {
    const { currentUser } = useUserContext();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            try {
                const response = await api.post('/events/create', {
                    user_id: parsedUser?.userId,
                    event_date: date.toDateString(),
                    title: title,
                    description: description,
                    start_time: startTime,
                    end_time: endTime
                });
                if (response.data.status === 201) {
                    setIsLoading(false);
                    onAddEvent({ date, title, description, startTime, endTime });
                    onClose();
                } else {
                    setErrorMsg(response.data.message);
                    setIsLoading(false);
                }
            } catch (error) {
                setErrorMsg('Failed to add event!');
                setIsLoading(false);
            }
        }
    };

    return (
        <>
            {errorMsg && 
                <Alert message={errorMsg} variant='critical' setClose={() => setErrorMsg('')} />
            }
            <div className="font-lato fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
                <div className="animate-pop-out bg-white p-6 rounded-lg w-[50%]">
                    <h2 className="text-xl text-[20px] font-bold mb-4 flex items-center gap-2">
                        <FaCalendarPlus className='text-[20px]' />
                        Add Event for
                        <span className="text-primary text-[20px] font-semibold">{date.toDateString()}</span>
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4 flex gap-4">
                            <div className="flex-1">
                                <label htmlFor="startTime" className="block mb-1 font-semibold text-[17px]">Start Time</label>
                                <input
                                    type="time"
                                    id="startTime"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full border rounded px-2 py-1"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="endTime" className="block mb-1 font-semibold text-[17px]">End Time</label>
                                <input
                                    type="time"
                                    id="endTime"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full border rounded px-2 py-1"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="title" className="block mb-1 font-semibold text-[17px]">Title</label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border rounded px-2 py-1"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="description" className="block mb-1 font-semibold text-[17px]">Description</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border rounded px-2 py-1"
                                rows={3}
                            ></textarea>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="mr-2 px-4 py-2 bg-gray-200 rounded font-semibold transition-colors hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-white rounded font-semibold transition-colors hover:bg-red-800 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Spinner className="h-5 w-5 mr-2" />
                                ) : (
                                    'Add Event'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddEventModal;