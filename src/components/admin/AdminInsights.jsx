import React from 'react';

export default function AdminInsights() {
    return (
        <div className="bg-white p-6 shadow-md rounded-lg space-y-4">
            <h3 className="text-xl font-semibold text-indigo-700">Google Analytics Insights</h3>
            <p className="text-gray-700">
                Access detailed e-commerce performance graphs, user acquisition reports, and conversion funnels directly in your Google Analytics 4 property.
            </p>
            <a
                // Replace with the actual URL to your GA4 property (e.g., Reports Home)
                href="https://analytics.google.com/analytics/web/" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150"
            >
                Go to GA4 Reports
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a>
            <p className="text-xs text-gray-500 mt-4">
                * Ensure you are logged into the Google Account associated with the GA4 property: G-4RETXH072M.
            </p>
        </div>
    );
}