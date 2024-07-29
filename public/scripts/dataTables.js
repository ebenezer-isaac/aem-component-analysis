$(document).ready(function() {
    // Initialize DataTables instances
    let resultTableInitialized = false;
    let usageCountTableInitialized = false;

    function populateResultTable() {
        const $tableBody = $('#resultTable tbody');
        $tableBody.empty();

        for (const [filePath, details] of Object.entries(data)) {
            const row = $('<tr>');
            const filePathCell = $('<td>').text(filePath);
            row.append(filePathCell);

            headers.forEach((header) => {
                const cellValue = details[header] || '';
                const cell = $('<td>').text(cellValue);
                row.append(cell);
            });

            $tableBody.append(row);
        }

        if (resultTableInitialized) {
            $('#resultTable').DataTable().clear().destroy();
        }

        $('#resultTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            "search": {
                "caseInsensitive": false
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

    function updateUsageCountTable(selectedHeader) {
        const usageCount = {};

        // Aggregate usage data
        for (const details of Object.values(data)) {
            const values = (details[selectedHeader] || '').split(',').map(v => v.trim()).filter(v => v && v !== 'N/A');
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
                usageCount[value].paths.push(details.path);
                usageCount[value].titles.push(details.title);
                usageCount[value].categories.push(details.category);
            });
        }

        const $tableBody = $('#usageCountTable tbody');
        $tableBody.empty();
        Object.entries(usageCount).forEach(([value, info]) => {
            const row = $('<tr>');
            row.append($('<td>').text(value));
            row.append($('<td>').text(info.count));
            row.append($('<td>').text(info.paths.join(', ')));
            row.append($('<td>').text(info.titles.join(', ')));
            row.append($('<td>').text(info.categories.join(', ')));

            $tableBody.append(row);
        });

        if (usageCountTableInitialized) {
            $('#usageCountTable').DataTable().clear().destroy();
        }

        $('#usageCountTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ]
        });

        usageCountTableInitialized = true;
    }

    $('#tableTypeDropdown').on('change', function() {
        const selectedTable = $(this).val();
        $('.table-container').hide();
        $(`#${selectedTable}Container`).show();
        if (selectedTable === 'usageCount') {
            populateHeaderDropdown();
        } else {
            populateResultTable();
        }
    });

    $('#headerDropdown').on('change', function() {
        updateUsageCountTable($(this).val());
    });

    // Initialize
    $('#tableTypeDropdown').val('resultTable').trigger('change');
});