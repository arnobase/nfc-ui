import React from 'react';
import { useTable, useSortBy } from 'react-table';

const ReadingsList = ({ readings, onSortReadings }) => {
    // Définir les colonnes du tableau
    const columns = React.useMemo(
        () => [
            {
                Header: 'Titre',
                accessor: 'title', // clé de l'objet
            },
            {
                Header: 'NFC ID',
                accessor: 'nfcId',
            },
            {
                Header: 'Timestamp',
                accessor: 'timestamp',
                Cell: ({ value }) => new Date(value).toLocaleString(), // Formater la date
            },
        ],
        []
    );

    // Utiliser le hook useTable pour créer le tableau
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable({ columns, data: readings }, useSortBy);

    return (
        <div>
            <h2 className="text-lg font-bold mb-2">Historique des lectures</h2>
            <table {...getTableProps()} className="table-auto w-full border border-gray-300">
                <thead>
                    {headerGroups.map(headerGroup => (
                        <tr {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map(column => (
                                <th
                                    {...column.getHeaderProps()}
                                    className="border border-gray-300 p-2 cursor-pointer"
                                    onClick={() => onSortReadings(column.id)} // Utiliser column.id au lieu de column.accessor
                                >
                                    {column.render('Header')}
                                    {/* Indicateur de tri */}
                                    <span>
                                        {column.isSorted
                                            ? column.isSortedDesc
                                                ? ' 🔽'
                                                : ' 🔼'
                                            : ''}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody {...getTableBodyProps()}>
                    {rows.map(row => {
                        prepareRow(row);
                        return (
                            <tr {...row.getRowProps()} className="border border-gray-300">
                                {row.cells.map(cell => (
                                    <td {...cell.getCellProps()} className="border border-gray-300 p-2">
                                        {cell.render('Cell')}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ReadingsList;
