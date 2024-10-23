function addItemToTable(materialId, materialName, quantity) {
    const newIndex = parseInt(totalForms.val());
    
    // Get current price info for the material
    fetch(`/materials/${materialId}/current-price/`)
        .then(response => response.json())
        .then(priceData => {
            if (!priceData.success) {
                alert("Erro: Material não possui preço válido cadastrado.");
                return;
            }

            const value = priceData.value;
            const taxValue = priceData.tax_value;
            const valueTotal = priceData.value_total * quantity;

            const template = `
                <tr>
                    <td>
                        <input type="hidden" name="${itemFormsetPrefix}-${newIndex}-material" value="${materialId}">
                        <input type="hidden" name="${itemFormsetPrefix}-${newIndex}-id" value="">
                        <input type="hidden" name="${itemFormsetPrefix}-${newIndex}-value" value="${value}">
                        <input type="hidden" name="${itemFormsetPrefix}-${newIndex}-tax_value" value="${taxValue}">
                        <input type="hidden" name="${itemFormsetPrefix}-${newIndex}-value_total" value="${valueTotal}">
                        ${materialName}
                    </td>
                    <td>
                        <input type="number" name="${itemFormsetPrefix}-${newIndex}-quantity" 
                               value="${quantity}" step="0.01" min="0.01" class="form-control">
                    </td>
                    <td>R$ ${value.toFixed(2)}</td>
                    <td>R$ ${taxValue.toFixed(2)}</td>
                    <td>R$ ${valueTotal.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn btn-danger btn-sm remove-item">Remover</button>
                    </td>
                </tr>
            `;
            
            $("#items_table tbody").append(template);
            totalForms.val(newIndex + 1);
            updateBudgetTotals();
        })
        .catch(error => {
            console.error('Erro ao obter preço do material:', error);
            alert('Erro ao adicionar item. Por favor, tente novamente.');
        });
}

function updateBudgetTotals() {
    let totalValue = 0;
    let totalTax = 0;
    let grandTotal = 0;

    $("#items_table tbody tr").each(function() {
        const value = parseFloat($(this).find('input[name$="-value"]').val()) || 0;
        const quantity = parseFloat($(this).find('input[name$="-quantity"]').val()) || 0;
        const taxValue = parseFloat($(this).find('input[name$="-tax_value"]').val()) || 0;
        const valueTotal = parseFloat($(this).find('input[name$="-value_total"]').val()) || 0;

        totalValue += value * quantity;
        totalTax += taxValue;
        grandTotal += valueTotal;
    });

    $("#budget_total_value").text(`R$ ${totalValue.toFixed(2)}`);
    $("#budget_total_tax").text(`R$ ${totalTax.toFixed(2)}`);
    $("#budget_grand_total").text(`R$ ${grandTotal.toFixed(2)}`);
}

// Add event listener for quantity changes
$(document).on('change', 'input[name$="-quantity"]', function() {
    const tr = $(this).closest('tr');
    const quantity = parseFloat($(this).val()) || 0;
    const value = parseFloat(tr.find('input[name$="-value"]').val()) || 0;
    const taxValue = parseFloat(tr.find('input[name$="-tax_value"]').val()) || 0;
    
    const valueTotal = value * quantity;
    tr.find('input[name$="-value_total"]').val(valueTotal);
    
    updateBudgetTotals();
});