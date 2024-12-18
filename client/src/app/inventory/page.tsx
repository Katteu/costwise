"use client";
import React, { useEffect, useRef, useState } from 'react';
import Header from '@/components/header/Header';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { MdTrolley, MdCalendarToday } from "react-icons/md";
import { IoIosArrowBack, IoIosArrowForward, IoIosSearch } from "react-icons/io";
import PrimaryPagination from '@/components/pagination/PrimaryPagination';
import MonthSelector from '@/components/modals/MonthSelector';
import { CiImport } from "react-icons/ci";
import { HiArchiveBoxXMark } from "react-icons/hi2";
import { RiFileCloseFill } from "react-icons/ri";
import ImportInventoryList from '@/components/modals/ImportInventory';
import api from '@/utils/api';
import { InventoryType } from '@/types/data';
import Alert from '@/components/alerts/Alert';
import ConfirmDeleteInventory from '@/components/modals/ConfirmDeleteInventory';
import Spinner from '@/components/loaders/Spinner';
import { useUserContext } from '@/contexts/UserContext';

const Inventory = () => {
    const { isOpen } = useSidebarContext();
    const columnNames = ["Item Code", "Description", "Unit", "Purchased Qty", "Usage Qty", "Total Qty", "Status"];

    const [alertMessages, setAlertMessages] = useState<string[]>([]);
    const [alertStatus, setAlertStatus] = useState<string>('');
    const [isMonthSelectorModalOpen, setMonthSelectorModalOpen] = useState(false);
    const [isImportInventoryListModalOpen, setImportInventoryListModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // const [isImport, setIsImport] = useState(false);

    const [monthOptions, setMonthOptions] = useState<{ display: string; value: string }[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [inventoryList, setInventoryList] = useState<InventoryType[][]>([]);
    const currentMonthInventory = inventoryList.find(monthData => monthData[0]?.month_year === selectedMonth) || [];
    const { currentUser } = useUserContext();
    const hasFetched = useRef(false);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Modals
    const openImportInventoryListModal = () => {
        const sysRoles = currentUser?.roles;
        if (sysRoles?.includes(6)) {
            setImportInventoryListModalOpen(true);
        } else {
            setAlertMessages(['You are not authorized to import inventory files.']);
            setAlertStatus('critical');
        }
    }

    const closeImportInventoryListModal = () => {
        setImportInventoryListModalOpen(false);
    }

    const openMonthSelectorModal = () => {
        setMonthSelectorModalOpen(true);
    };

    const closeMonthSelectorModal = () => {
        setMonthSelectorModalOpen(false);
    };

    const openDeleteModal = () => {
        const sysRoles = currentUser?.roles;
        if (!sysRoles?.includes(8)) {
            setAlertMessages(['You are not authorized to delete/archive files.']);
            setAlertStatus('critical');
            return;
        }
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
    };

    //Format numbers & monthYear
    const numberWithCommas = (x: number) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    const convertMonthYear = (monthYear: string[]): { display: string; value: string }[] => {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August",
            "September", "October", "November", "December"];

        return monthYear.map(date => {
            const [year, monthNumber] = date.split('-');
            const monthIndex = parseInt(monthNumber, 10) - 1;
            return {
                display: `${months[monthIndex]} ${year}`,
                value: date
            };
        });
    }

    const logLowStockAudit = (item: InventoryType) => {
        const user = localStorage.getItem('currentUser');
        const parsedUser = JSON.parse(user || '{}');
        
        const auditData = {
            userId: parsedUser?.userId,
            action: 'stock',
            act: `low stock`,
            material_code: item.material_code,
            material_desc: item.material_desc
        };

        api.post('/auditlogs/logsaudit', auditData)
            .then(response => {
            })
            .catch(error => {
            });
    };

    // Retrieve inventory list
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchInventoryLists = async () => {
            try {
                const response = await api.get('/inventory/lists');
                if (response.data.data) {
                    const inventoryData = response.data.data;
                    if (Array.isArray(inventoryData)) {
                        const processedInventoryList = inventoryData.map(monthData => {
                            const inventoryItems = monthData.inventory_info.map((item: any) => {
                                const material = monthData.materials.find((m: any) => m.material_id === item.material_id);
                                return {
                                    ...item,
                                    material_code: material?.material_code || '',
                                    material_desc: material?.material_desc || '',
                                    unit: material?.unit || '',
                                    month_year: monthData.month_year,
                                    stock_status: item.stock_status
                                };
                            });
                            return inventoryItems;
                        });
                        setInventoryList(processedInventoryList);

                        const checkImport = localStorage.getItem('isImport') == 'true';
                        if(checkImport){
                            processedInventoryList.flat().forEach(item => {
                                if (item.stock_status === 'Low Stock') {
                                    logLowStockAudit(item);
                                }
                            });
                            localStorage.removeItem('isImport');
                        }

                        //Set month options
                        const extractMonths = inventoryData.map((item: any) => item.month_year);
                        const convertedMonths = convertMonthYear(extractMonths);
                        setMonthOptions(convertedMonths);

                        if (convertedMonths.length > 0 && !selectedMonth) {
                            setSelectedMonth(convertedMonths[0].value);
                        }

                        setIsLoading(false);

                    } else {
                        setAlertMessages(['Error retrieving inventory lists.']);
                        setAlertStatus('critical');
                    }
                } else {
                    setAlertMessages(['No data retrieved.']);
                    setAlertStatus('critical');
                }
            } catch (error) {
                setIsLoading(false);
            }
        };
        fetchInventoryLists();
    });

    useEffect(() => {
        if (monthOptions.length > 0 && !selectedMonth) {
            setSelectedMonth(monthOptions[0].value);
            setCurrentIndex(0);
        }
    }, [monthOptions]);

    // useEffect(() => {
    //     if (isImport) {
    //         localStorage.setItem('isImport', 'true');
    //     } else {
    //         localStorage.removeItem('isImport');
    //     }
    // }, [isImport]);

    // Search & Filter
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterCategory(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterStatus(e.target.value);
        setCurrentPage(1);
    };

    // Filter and search function
    const filteredAndSearchedInventory = currentMonthInventory.filter((item) => {
        const matchesSearch = item.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.material_desc.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory === '' || filterCategory === 'all' ||
            item.material_category === filterCategory;

        const matchesStatus = filterStatus === '' || filterStatus === 'all' ||
            (filterStatus === 'in-stock' && item.stock_status === 'In Stock') ||
            (filterStatus === 'low-stock' && item.stock_status === 'Low Stock');

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Month Pagination
    const handlePageChange = (e: React.ChangeEvent<unknown>, page: number) => {
        setCurrentPage(page);
    };

    const handleMonthSelect = (month: string) => {
        setSelectedMonth(month);
        const newIndex = monthOptions.findIndex(option => option.value === month);
        setCurrentIndex(newIndex);
        setCurrentPage(1);
        closeMonthSelectorModal();
    };

    const handlePreviousMonth = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            setSelectedMonth(monthOptions[newIndex].value);
            setCurrentPage(1);
        }
    };

    const handleNextMonth = () => {
        if (currentIndex < monthOptions.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            setSelectedMonth(monthOptions[newIndex].value);
            setCurrentPage(1);
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const itemsPerPage = 8;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPageItems = filteredAndSearchedInventory.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <>
            {isMonthSelectorModalOpen &&
                <MonthSelector months={monthOptions} onMonthSelect={handleMonthSelect} onClose={closeMonthSelectorModal} />
            }

            {isImportInventoryListModalOpen &&
                <ImportInventoryList onClose={closeImportInventoryListModal}/>
            }

            {isDeleteModalOpen && <ConfirmDeleteInventory inventoryList={currentMonthInventory} monthYear={selectedMonth} onClose={closeDeleteModal} />}

            <div className="fixed top-4 right-4 z-50">
                <div className="flex flex-col items-end space-y-2">
                    {alertMessages && alertMessages.map((msg, index) => (
                        <Alert className="!relative" variant={alertStatus as "default" | "information" | "warning" | "critical" | "success" | undefined} key={index} message={msg} setClose={() => {
                            setAlertMessages(prev => prev.filter((_, i) => i !== index));
                        }} />
                    ))}
                </div>
            </div>

            <div className='w-full'>
                <div>
                    <Header icon={MdTrolley} title="Inventory" />
                </div>

                <div className={`${isOpen ? '4xl:h-[47rem] 3xl:h-[47rem] 2xl:h-[45rem] xl:h-[44rem]' : '4xl:h-[47rem] 3xl:h-[47rem] 2xl:h-[45rem] xl:h-[47rem]'} relative w-auto h-[47rem] ml-[4rem] mr-[3rem] my-[3rem] rounded-2xl bg-white border-1 border-[#656565] shadow-md animate-fade-in2`}>
                    {/* Header */}
                    <div className='flex h-14 rounded-t-2xl bg-[#B22222] text-white text-[26px] font-bold py-2 pl-5'>

                        {/* Month Button */}
                        <button
                            title="Month Selector"
                            onClick={openMonthSelectorModal}
                            className='flex items-center mt-1 text-white  bg-[#cb3636] px-2 py-1 rounded-lg cursor-pointer hover:bg-[#D9D9D98E] transition-colors duration-300 ease-in-out'>
                            <MdCalendarToday className='text-[28px] mr-4' />
                            <p className="animate-appearance-in mr-2">
                                {monthOptions.find(m => m.value === selectedMonth)?.display || ''}</p>
                        </button>

                        

                        {/* Navigator Buttons */}
                        <div className='flex w-[8rem] ml-auto'>
                            <div className='w-[50%]'>
                                {currentIndex > 0 && (
                                    <button
                                        onClick={handlePreviousMonth}
                                        className='w-[2.5rem] h-[2.5rem] rounded-full text-white text-[30px] px-1 mr-4 bg-[#d9d9d98e] cursor-pointer hover:bg-[#bd2a2a] transition-colors duration-300 ease-in-out'>
                                        <IoIosArrowBack />
                                    </button>
                                )}
                            </div>
                            {currentIndex < monthOptions.length - 1 && (
                                <button
                                    onClick={handleNextMonth}
                                    className='w-[2.5rem] h-[2.5rem] rounded-full text-white text-[30px] px-2 mr-4 bg-[#d9d9d98e] cursor-pointer hover:bg-[#bd2a2a] transition-colors duration-300 ease-in-out'>
                                    <IoIosArrowForward />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Area */}
                    <div className='flex w-full h-[3.5rem] bg-[#F3F3F3] dark:bg-[#4c4c4c] border-solid border-b border-[#868686]'>
                        <div className="mt-[0.8em] ml-7 text-gray-400">
                            <div className='flex absolute text-[1.3em] mt-[0.3rem] ml-3'>
                                <IoIosSearch className='dark:text-[#d1d1d1]'/>
                            </div>
                            <input
                                className={`${isOpen ? '4xl:w-[20rem] 3xl:w-[16rem] 2xl:w-[12rem] xl:w-[8rem]' : '4xl:w-[30rem] 3xl:w-[30rem] 2xl:w-[20rem] xl:w-[15rem]'} w-[30rem] bg-white dark:bg-[#4c4c4c] dark:text-white dark:border-[#d1d1d1] dark:placeholder-[#d1d1d1] h-8  px-5 pl-9 text-[1.1em] border border-gray-400 rounded-lg focus:outline-none`}
                                type="search"
                                name="search"
                                placeholder="Search here..."
                                onChange={handleSearch}
                            />
                        </div>

                        <div className='flex mt-[0.8em] mr-4 ml-auto text-gray-400 gap-4'>
                            <select
                                className={`${isOpen ? '4xl:w-[20rem] 3xl:w-[16rem] 2xl:w-[12rem] xl:w-[7rem]' : '4xl:w-[20rem] 3xl:w-[20rem] 2xl:w-[15rem] xl:w-[10rem]'} bg-white dark:bg-[#4c4c4c] dark:text-white dark:border-[#d1d1d1] dark:placeholder-[#d1d1d1] h-8 w-[20rem] pl-3 text-[1.1em] border border-gray-400 rounded-lg focus:outline-none`}
                                onChange={handleFilterCategory}
                            >
                                <option selected value="" disabled hidden>Item Category</option>
                                <option value="all">All</option>
                                <option value="meat_material">Meat Materials</option>
                                <option value="meat_alternate">Meat Alternates</option>
                                <option value="food_ingredient">Food Ingredients</option>
                                <option value="packaging">Packaging Materials</option>
                                <option value="casing">Casing</option>
                                <option value="tin_can">Tin Can</option>
                                <option value="other">Other</option>

                            </select>

                            <select
                                className='bg-white h-8 w-[8rem] pl-3 text-[1.1em] border border-gray-400 rounded-lg focus:outline-none dark:bg-[#4c4c4c] dark:text-white dark:border-[#d1d1d1] dark:placeholder-[#d1d1d1]'
                                onChange={handleFilterStatus}
                            >
                                <option selected value="" disabled hidden>Status</option>
                                <option value="all">All</option>
                                <option value="in-stock">In Stock</option>
                                <option value="low-stock">Low Stock</option>
                            </select>

                            {/* Action Buttons */}
                            <button
                                title="Import Inventory List"
                                className={`${isOpen ? 'text-[15px] 3xl:text-[18px] 2xl:text-[17px]' : 'text-[15px] 2xl:text-[18px]'} h-8 w-[7rem] pl-[4px] pr-[8px] py-[5px] bg-primary text-white rounded-[5px] drop-shadow-lg flex items-center justify-center hover:bg-[#9c1c1c] transition-colors duration-200 ease-in-out`}
                                onClick={openImportInventoryListModal}
                            >
                                <span><CiImport className='w-[30px] h-[22px]' /></span>
                                <span className='font-semibold'>Import</span>
                            </button>
                            {inventoryList.length > 0 && (
                                <button
                                    title="Archive Inventory List"
                                    className={`${isOpen ? 'text-[15px] 3xl:text-[18px]' : 'text-[15px] 2xl:text-[18px]'} h-8 px-[8px] py-[5px] bg-primary text-white rounded-[5px] drop-shadow-lg flex items-center hover:bg-[#9c1c1c] transition-colors duration-200 ease-in-out`}
                                    onClick={openDeleteModal}
                                >
                                    <HiArchiveBoxXMark className="text-[22px] transition-colors duration-250 ease-in-out" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className={`${isOpen ? '4xl:h-[552px] 3xl:h-[552px] 2xl:h-[525px] xl:h-[515px]' : '4xl:h-[552px] 3xl:h-[542px] 2xl:h-[512px] xl:h-[550px]'} dark:bg-[#3c3c3c] h-[552px] overflow-x-auto`}>
                        <table className='table-auto w-full border-collapse'>
                            <thead>
                                <tr className='dark:text-[#d1d1d1]'>
                                    {columnNames.map((columnName, index) => (
                                        <th key={index} className={`${isOpen ? '4xl:text-[19px] 3xl:text-[18px] 2xl:text-[16px] xl:text-[16px]' : '4xl:text-[20px] 3xl:text-[18px] 2xl:text-[17px] xl:text-[16px]'} dark:text-[#d1d1d1] text-[20px] text-center animate-zoomIn whitespace-nowrap font-bold  text-[#6B6B6B] py-2 px-4 border-b border-[#ACACAC]`}>
                                            {columnName}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr className="dark:bg-[#3c3c3c]">
                                        <td colSpan={7} className="text-center pt-[15rem]">
                                            <div className='flex justify-center items-center'>
                                                <Spinner/>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentPageItems.length > 0 ? (
                                    currentPageItems.map((data, index) => (
                                        <tr key={index} className={`${isOpen ? '4xl:text-[19px] 3xl:text-[18px] 2xl:text-[16px] xl:text-[16px]' : '4xl:text-[20px] 3xl:text-[18px] 2xl:text-[17px] xl:text-[16px]'} dark:text-[#d1d1d1] text-[20px] text-black text-center border-b border-[#ACACAC] hover:bg-gray-50 dark:hover:bg-[#4c4c4c]`}>
                                            <td className={`${isOpen ? '2xl:py-6' : '4xl:w-[18rem] 3xl:w-[17rem] 2xl:w-[15rem]'} w-[18rem] py-4 text-left pl-8`}>
                                                {data.material_code}</td>
                                            <td className='break-words'>{data.material_desc}</td>
                                            <td>{data.unit}</td>
                                            <td className='w-[10%] text-right pr-4'>{numberWithCommas(data.purchased_qty)}</td>                                           
                                            <td className='text-right pr-6'>{numberWithCommas(data.usage_qty)}</td>
                                            <td className='text-right pr-6 font-semibold'>{numberWithCommas(data.total_qty)}</td>
                                            <td className={`${isOpen ? '4xl:pr-2 3xl:pr-4 2xl:pr-4 xl:pr-2': '4xl:pr-2 3xl:pr-4 2xl:pr-4 xl:pr-2'}`}>
                                                <div className='flex justify-center'>
                                                    <p
                                                        className={`${data.stock_status === 'In Stock'
                                                            ? 'text-[#00930F] bg-[#9EE29E]'
                                                            : 'text-primary bg-[#F5BABA]'
                                                            } rounded-2xl w-[9rem] ${isOpen ? '4xl:w-[8rem] 3xl:w-[8rem] 2xl:w-[6rem] xl:w-[5rem]' : '4xl:w-[9rem] 3xl:w-[8rem] 2xl:w-[6rem] xl:w-[5rem]'}`}
                                                    >
                                                        {data.stock_status}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className='dark:bg-[#3c3c3c]'>
                                        <td colSpan={columnNames.length} className='items-center justify-items-center text-center font-semibold pt-[13rem] text-[#555555] dark:text-white'>
                                            <RiFileCloseFill className='text-[85px] mb-4' />
                                            <p className='text-[20px]'> No inventory lists found.</p>
                                        </td>
                                    </tr>
                                )

                                }
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="flex w-full justify-center h-[86px] rounded-b-xl dark:bg-[#3c3c3c] border-[#868686]">
                        <PrimaryPagination
                            data={filteredAndSearchedInventory}
                            itemsPerPage={itemsPerPage}
                            handlePageChange={handlePageChange}
                            currentPage={currentPage}
                        />
                    </div>
                </div>
            </div>
        </>
    )
};

export default Inventory;