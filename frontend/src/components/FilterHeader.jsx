import { useEffect, useRef, useState } from 'react';
import { getFilterOptions } from '../api';
import Select from 'react-select';
import './FilterHeader.scss';

export default function FilterHeader({ filters, onFilterChange, resetFilters }) {
    const [options, setOptions] = useState({ institutes: [], specialties: [], years: [] });
    const [loading, setLoading] = useState(true);
    const reqRef = useRef(0);

    //загрузка вариантов
    useEffect(() => {
        getFilterOptions()
            .onSuccess(async response => {
                const data = await response.json();
                setOptions(data.data);
                setLoading(false);
            })
            .onError(err => console.error('Ошибка загрузки опций', err));
    }, []);

    useEffect(() => {
        const institute = filters?.institute;
        if (!institute) {
            getFilterOptions()
                .onSuccess(async response => {
                    const data = await response.json();
                    setOptions(data.data);
                })
                .onError(err => console.error('Ошибка загрузки опций', err));
            return;
        }
        const id = ++reqRef.current;
        getFilterOptions(institute)
            .onSuccess(async res => {
                if (id !== reqRef.current) return;
                const data = await res.json();
                const newSpecs = data.data.specialties || [];
                setOptions(prev => ({ ...prev, specialties: newSpecs }));

                // если выбранная спец не в новом списке - сброс
                if (filters?.specialty && !newSpecs.some(s => s.value === filters.specialty)) {
                    onFilterChange('specialty', '');
                }
            })
            .onError(() => {
                if (id === reqRef.current) setLoading(false);
            });
    }, [filters?.institute]);

    const handleChange = (opt, name) => {
        onFilterChange(name, opt ? opt.value : '');
    };

    const customStyles = {
        container: base => ({ ...base, flex: 1, minWidth: '200px' }),
        control: base => ({ ...base, borderRadius: '8px', borderColor: '#ddd' })
    };
    const findOption = (opts, value) => {
        if (!value) return null;
        return opts?.find(o => o.value === value) || null;
    };
    const sorted = opts =>
        (opts || []).slice().sort((a, b) => a.label.localeCompare(b.label, 'ru', { numeric: true, sensitivity: 'base' }));

    return (
        <div className="filter-row">
            <Select
                name="institute"
                placeholder="Институт..."
                isClearable
                isSearchable
                options={sorted(options?.institutes) || []}
                onChange={opt => handleChange(opt, 'institute')}
                styles={customStyles}
                isLoading={loading}
            />

            <Select
                name="specialty"
                placeholder="Направление..."
                isClearable
                isSearchable
                options={sorted(options?.specialties) || []}
                value={findOption(options?.specialties, filters?.specialty)}
                onChange={opt => handleChange(opt, 'specialty')}
                styles={customStyles}
                isLoading={loading}
            />

            <Select
                name="year"
                placeholder="Год..."
                isClearable
                isSearchable
                options={sorted(options?.years) || []}
                onChange={opt => handleChange(opt, 'year')}
                styles={customStyles}
                isLoading={loading}
            />

            <button onClick={resetFilters}> Сбросить </button>
        </div>
    );
}
