import React, { createContext, useState, useContext } from 'react';
import { create } from 'zustand';

const DEFAULT_PAGE = '/admin/stats';

export const useAdminStore = create(set => ({
    currentPage: DEFAULT_PAGE,
    setCurrentPage: page =>
        set({
            currentPage: page
        }),

    savedFilters: { 'Admin': {} },
    saveFilters: (page, data) =>
        set(state => ({
            savedFilters: {
                ...state.savedFilters,
                [page]: data
            }
        }))
}));
