$(document).ready(function() {
    // Initialize DataTables instances
    let resultTableInitialized = false;
    let usageCountTableInitialized = false;
    let defaultHeaderValue = 'carbonImport';
    let currentHeaderValue = null;
    let defaultPageLength = 50; // Default page length

    function populateResultTable(pageLength) {
        const $tableBody = $('#resultTable tbody');
        $tableBody.empty();

        if (!data || !headers) {
            console.warn('Data or headers are not available for result table.');
            return;
        }

        // Define columns based on headers
        const columns = [
            { title: 'File Path' },
            ...headers.map(header => ({ title: header }))
        ];

        if (resultTableInitialized) {
            $('#resultTable').DataTable().clear().destroy();
        }

        $('#resultTable').DataTable({
            dom: 'Bfrtip',
            data: data,
            columns: columns,
            pageLength: pageLength, // Set page length
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
            search: {
                caseInsensitive: false
            },
            fixedHeader: true,
            scrollX: true,
            fixedColumns: {
                leftColumns: 3
            }
        });

        resultTableInitialized = true;
    }

    function populateHeaderDropdown() {
        $('#headerDropdown').empty(); // Clear existing options
        headers.forEach(header => {
            const option = $('<option>').val(header).text(header);
            $('#headerDropdown').append(option);
        });
    }

    function updateUsageCountTable(selectedHeader, pageLength) {
        if (!data) {
            console.warn('Data is not available for usage count table.');
            return;
        }

        const usageCount = {};

        // Aggregate usage data
        data.forEach(row => {
            const filePath = row[0];
            const details = {};
            headers.forEach((header, index) => {
                details[header] = row[index + 1];
            });

            const rawValues = details[selectedHeader];
            if (!rawValues) return; // Skip if the header value is not defined

            const values = typeof rawValues === 'string' ?
                rawValues.split(',').map(v => v.trim()).filter(v => v && v !== 'N/A') : [];

            values.forEach(value => {
                if (!usageCount[value]) {
                    usageCount[value] = {
                        count: 0,
                        paths: [],
                        titles: [],
                        categories: []
                    };
                }
                usageCount[value].count += 1;
                usageCount[value].paths.push(filePath);
                usageCount[value].titles.push(details.title || 'N/A');
                usageCount[value].categories.push(details.category || 'N/A');
            });
        });

        const rows = Object.entries(usageCount).map(([value, info]) => [
            value,
            info.count,
            info.paths.join(', '),
            info.titles.join(', '),
            info.categories.join(', ')
        ]);

        const $tableBody = $('#usageCountTable tbody');
        $tableBody.empty();

        if (usageCountTableInitialized) {
            $('#usageCountTable').DataTable().clear().destroy();
        }

        $('#usageCountTable').DataTable({
            dom: 'Bfrtip',
            data: rows,
            columns: [
                { title: 'Unique Value' },
                { title: 'Usage Count' },
                { title: 'File Paths' },
                { title: 'Titles' },
                { title: 'Category' }
            ],
            pageLength: pageLength, // Set page length
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
            search: {
                caseInsensitive: false // Make search case sensitive
            },
            fixedHeader: true,
            scrollX: true,
            fixedColumns: {
                leftColumns: 1
            }
        });

        usageCountTableInitialized = true;
    }

    $('#tableTypeDropdown').on('change', function() {
        const selectedTable = $(this).val();
        $('.table-container').hide();
        $(`#${selectedTable}Container`).show();

        const pageLength = parseInt($('#pageLengthDropdown').val(), 10) || defaultPageLength;

        if (selectedTable === 'usageCount') {
            populateHeaderDropdown();
            $('#resultTable').DataTable().clear().destroy();
            if (currentHeaderValue == null) {
                $('#headerDropdown').val(defaultHeaderValue);
                currentHeaderValue = defaultHeaderValue;
                updateUsageCountTable(currentHeaderValue, pageLength);
            } else {
                updateUsageCountTable(currentHeaderValue, pageLength);
            }
        } else if (selectedTable === 'resultTable') {
            populateResultTable(pageLength);
            $('#usageCountTable').DataTable().clear().destroy();
        }
    });

    $('#headerDropdown').on('change', function() {
        const pageLength = parseInt($('#pageLengthDropdown').val(), 10) || defaultPageLength;
        currentHeaderValue = $(this).val();
        updateUsageCountTable(currentHeaderValue, pageLength);
    });

    $('#pageLengthDropdown').on('change', function() {
        const pageLength = parseInt($(this).val(), 10) || defaultPageLength;
        if ($('#tableTypeDropdown').val() === 'resultTable') {
            populateResultTable(pageLength);
        } else {
            updateUsageCountTable(currentHeaderValue, pageLength);
        }
    });

    // Initialize
    $('#tableTypeDropdown').val('resultTable').trigger('change');
    $('#pageLengthDropdown').val(defaultPageLength); // Set default value for page length
});