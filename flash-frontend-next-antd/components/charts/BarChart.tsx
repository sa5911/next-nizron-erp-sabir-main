'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import './BaseChart';

interface BarChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor?: string | string[];
            borderColor?: string | string[];
            borderWidth?: number;
            borderRadius?: number;
            hoverBackgroundColor?: string | string[];
        }[];
    };
    title?: string;
    horizontal?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ data, title, horizontal }) => {
    const options = {
        indexAxis: horizontal ? ('y' as const) : ('x' as const),
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: !!title,
                text: title || '',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <Bar data={data} options={options} />
        </div>
    );
};

export default BarChart;
