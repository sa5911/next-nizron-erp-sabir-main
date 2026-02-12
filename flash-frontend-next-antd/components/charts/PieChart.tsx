'use client';

import React from 'react';
import { Pie } from 'react-chartjs-2';
import './BaseChart';

interface PieChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor?: string | string[];
            borderColor?: string | string[];
            borderWidth?: number;
            hoverBackgroundColor?: string | string[];
        }[];
    };
    title?: string;
}

const PieChart: React.FC<PieChartProps> = ({ data, title }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            title: {
                display: !!title,
                text: title || '',
            },
        },
    };

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <Pie data={data} options={options} />
        </div>
    );
};

export default PieChart;
