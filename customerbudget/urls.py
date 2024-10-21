from django.contrib import admin
from django.urls import path, include
from apps.budget.views import (
    home, CustomerListView, get_customer_data, 
    MaterialListView, get_material_data,
    BudgetCreateView, BudgetListView, BudgetEditView
    ,remove_budget_item, cancel_budget, search_customers
    ,generate_budget_pdf, BudgetPDFPreviewView, PendingBudgetsView
    ,AwaitingAcceptanceView, InstallationSchedulingView, InstallationsView
    ,DashboardView, HomeView, 
    tax_list, tax_create, tax_update, tax_delete, 
    price_list, price_list_data, delete_price_list
    ,delete_materials, PriceListView, delete_customer, delete_customers
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', HomeView.as_view(), name='home'),
    path('budget/', include('apps.budget.urls')),
    path('', DashboardView.as_view(), name='dashboard'),
    path('customers/', CustomerListView.as_view(), name='customer_list'),
    path('customers/<int:customer_id>/data/', get_customer_data, name='get_customer_data'),
    path('customers/<int:customer_id>/delete/', delete_customer, name='delete_customer'),
    path('customers/<int:customer_id>/delete/', delete_customers, name='delete_customer'),
    path('search-customers/', search_customers, name='search_customers'),

    path('materials/', MaterialListView.as_view(), name='material_list'),
    path('materials/<int:material_id>/data/', get_material_data, name='get_material_data'),
    path('materials/delete/', delete_materials, name='delete_materials'),
    
    # budgets
    path('budgets/', BudgetListView.as_view(), name='budget_list'),
    path('budgets/create/', BudgetCreateView.as_view(), name='budget_create'),
    path('budgets/<int:pk>/edit/', BudgetEditView.as_view(), name='budget_edit'),
    path('budgets/item/<int:pk>/remove/', remove_budget_item, name='remove_budget_item'),
    path('budgets/<int:pk>/cancel/', cancel_budget, name='cancel_budget'),
    path('budgets/<int:budget_id>/pdf/', generate_budget_pdf, name='budget_pdf'),
    path('budgets/<int:budget_id>/pdf-preview/', BudgetPDFPreviewView.as_view(), name='budget_pdf_preview'),
    path('budgets/pending/', PendingBudgetsView.as_view(), name='pending_budgets'),
    path('budgets/awaiting-acceptance/', AwaitingAcceptanceView.as_view(), name='awaiting_acceptance'),
    path('budgets/installation-scheduling/', InstallationSchedulingView.as_view(), name='installation_scheduling'),
    path('installations/', InstallationsView.as_view(), name='installations'),

    # Tax
    path('taxes/', tax_list, name='tax_list'),
    path('taxes/create/', tax_create, name='tax_create'),
    path('taxes/<int:pk>/update/', tax_update, name='tax_update'),
    path('taxes/<int:pk>/delete/', tax_delete, name='tax_delete'),

    #path('price-list/', price_list, name='price_list'),
    path('price-list/', PriceListView.as_view(), name='price_list'),
    path('price-list/<int:pk>/data/', price_list_data, name='price_list_data'),
    path('price-list/<int:pk>/delete/', delete_price_list, name='delete_price_list'),

    # Adicione URLs para as outras páginas conforme necessário
    path('agendamento/', home, name='agendamento'),  # Placeholder
    path('orcamento/', home, name='orcamento'),  # Placeholder
    path('pendentes-aceite/', home, name='pendentes_aceite'),  # Placeholder
    path('cadastros-gerais/', home, name='cadastros_gerais'),  # Placeholder
    path('usuarios/', home, name='usuarios'),  # Placeholder
]