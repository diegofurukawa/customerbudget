document.addEventListener('DOMContentLoaded', function() {
    // Funções auxiliares
    function $(id) {
        return document.getElementById(id);
    }

    function $$(selector) {
        return document.querySelectorAll(selector);
    }

    function setValueSafely(id, value) {
        const element = $(id);
        if (element) {
            element.value = value;
        } else {
            console.warn(`Elemento com id '${id}' não encontrado.`);
        }
    }

    function setCheckedSafely(id, value) {
        const element = $(id);
        if (element) {
            element.checked = value;
        } else {
            console.warn(`Elemento com id '${id}' não encontrado.`);
        }
    }

    // Elementos do DOM
    const searchInput = $('searchInput');
    const searchButton = $('searchButton');
    const materialTable = $('materialTable');
    const selectAll = $('selectAll');
    const editMaterialBtn = $('editMaterialBtn');
    const newMaterialBtn = $('newMaterialBtn');
    const materialModal = $('materialModal');
    const closeBtn = materialModal ? materialModal.querySelector('.close') : null;
    const cancelBtn = $('cancelBtn');
    const materialForm = $('materialForm');
    const addTaxBtn = $('add-tax');
    const taxTable = $('tax-table') ? $('tax-table').getElementsByTagName('tbody')[0] : null;

    // Funções do modal
    function openModal() {
        if (materialModal) {
            materialModal.style.display = 'block';
        }
    }

    function closeModal() {
        if (materialModal) {
            materialModal.style.display = 'none';
        }
    }

    // Event listeners
    if (newMaterialBtn) {
        newMaterialBtn.onclick = function() {
            const modalTitle = $('modalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'NOVO MATERIAL';
            }
            if (materialForm) {
                materialForm.reset();
            }
            setValueSafely('material_id', '');
            openModal();
        }
    }

    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    if (cancelBtn) {
        cancelBtn.onclick = closeModal;
    }

    if (materialModal) {
        window.onclick = function(event) {
            if (event.target == materialModal) {
                closeModal();
            }
        }
    }

    function performSearch() {
        if (!searchInput || !materialTable) return;

        const searchTerm = searchInput.value.toLowerCase();
        const rows = materialTable.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) {
            const name = rows[i].getElementsByTagName('td')[1].textContent.toLowerCase();
            const nickname = rows[i].getElementsByTagName('td')[2].textContent.toLowerCase();
            if (name.includes(searchTerm) || nickname.includes(searchTerm)) {
                rows[i].style.display = '';
            } else {
                rows[i].style.display = 'none';
            }
        }
    }

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }

    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = $$('.material-select');
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAll.checked;
            });
            updateEditButton();
        });
    }

    $$('.material-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditButton);
    });

    function updateEditButton() {
        if (!editMaterialBtn) return;
        const selectedMaterials = $$('.material-select:checked');
        editMaterialBtn.disabled = selectedMaterials.length !== 1;
    }

    if (editMaterialBtn) {
        editMaterialBtn.addEventListener('click', function() {
            const selectedMaterial = document.querySelector('.material-select:checked');
            if (selectedMaterial) {
                const materialId = selectedMaterial.getAttribute('data-id');
                editMaterial(materialId);
            }
        });
    }

    $$('.edit-material').forEach(button => {
        button.addEventListener('click', function() {
            const materialId = this.getAttribute('data-id');
            editMaterial(materialId);
        });
    });

    function editMaterial(materialId) {
        fetch(`/materials/${materialId}/data/`)
            .then(response => response.json())
            .then(data => {
                setValueSafely('material_id', data.id);
                setValueSafely('id_full_name', data.full_name);
                setValueSafely('id_nick_name', data.nick_name);
                setValueSafely('id_description', data.description);
                setValueSafely('id_ean_code', data.ean_code);
                setCheckedSafely('id_active', data.active);
                
                // Atualizar a exibição do preço atual (se necessário)
                const currentPriceDisplay = document.getElementById('current_price_display');
                if (currentPriceDisplay && data.current_price) {
                    currentPriceDisplay.textContent = `Valor Atual: R$ ${parseFloat(data.current_price.total_value).toFixed(2)}`;
                    
                    // Se quiser mostrar mais detalhes do preço
                    if (data.current_price.tax_info) {
                        currentPriceDisplay.title = `Valor Base: R$ ${parseFloat(data.current_price.base_value).toFixed(2)}\n` +
                                                  `${data.current_price.tax_info}: R$ ${parseFloat(data.current_price.tax_value).toFixed(2)}`;
                    }
                }
    
                const modalTitle = document.getElementById('modalTitle');
                if (modalTitle) {
                    modalTitle.textContent = 'EDITAR MATERIAL';
                }
                openModal();
            })
            .catch(error => console.error('Erro ao carregar dados do material:', error));
    }
    
    // Função para atualizar a linha da tabela com os dados do material
    function updateMaterialRow(materialId, data) {
        const row = document.querySelector(`tr[data-id="${materialId}"]`);
        if (row) {
            row.querySelector('td:nth-child(2)').textContent = data.full_name;
            row.querySelector('td:nth-child(3)').textContent = data.nick_name || '';
            row.querySelector('td:nth-child(4)').textContent = 
                data.current_price ? `R$ ${parseFloat(data.current_price.total_value).toFixed(2)}` : 'R$ 0,00';
            row.querySelector('td:nth-child(5)').textContent = data.active ? 'Sim' : 'Não';
        }
    }
    
    // Atualizar a função de salvamento para lidar corretamente com a resposta
    function handleMaterialSave(formData) {
        fetch('/materials/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.material_id) {
                    updateMaterialRow(data.material_id, data);
                } else {
                    location.reload(); // Recarrega a página para mostrar o novo material
                }
                closeModal();
                showAlert('Material salvo com sucesso!', 'success');
            } else {
                showFormErrors(data.errors);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar material:', error);
            showAlert('Erro ao salvar material. Por favor, tente novamente.', 'danger');
        });
    }

    if (addTaxBtn) {
        addTaxBtn.addEventListener('click', function() {
            addTaxRow();
        });
    }

    function addTaxRow(taxId = '', sign = '+') {
        if (!taxTable) return;

        const newRow = taxTable.insertRow();
        const taxCell = newRow.insertCell(0);
        const signCell = newRow.insertCell(1);
        const actionCell = newRow.insertCell(2);

        const taxSelect = document.createElement('select');
        taxSelect.className = 'form-control tax-select';
        taxSelect.name = `taxes-${taxTable.rows.length - 1}-tax`;
        // Adicione as opções de impostos aqui
        taxCell.appendChild(taxSelect);

        const signSelect = document.createElement('select');
        signSelect.className = 'form-control';
        signSelect.name = `taxes-${taxTable.rows.length - 1}-sign`;
        signSelect.innerHTML = `
            <option value="+" ${sign === '+' ? 'selected' : ''}>+</option>
            <option value="-" ${sign === '-' ? 'selected' : ''}>-</option>
        `;
        signCell.appendChild(signSelect);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-sm remove-tax';
        removeBtn.textContent = 'Remover';
        removeBtn.addEventListener('click', function() {
            taxTable.deleteRow(newRow.rowIndex - 1);
        });
        actionCell.appendChild(removeBtn);
    }

    if (materialForm) {
        materialForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(materialForm);
            fetch('/materials/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    closeModal();
                    location.reload();
                } else {
                    Object.keys(data.errors).forEach(key => {
                        const field = $(`id_${key}`);
                        if (field) {
                            field.classList.add('is-invalid');
                            const feedback = field.nextElementSibling || document.createElement('div');
                            feedback.className = 'invalid-feedback';
                            feedback.textContent = data.errors[key].join(', ');
                            if (!field.nextElementSibling) {
                                field.parentNode.appendChild(feedback);
                            }
                        }
                    });
                }
            })
            .catch(error => console.error('Erro ao salvar material:', error));
        });
    }
});