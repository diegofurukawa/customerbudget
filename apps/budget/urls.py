from django.urls import include, path
from . import views

app_name = 'budget'

urlpatterns = [
    # Dashboard
    path('', views.DashboardView.as_view(), name='dashboard'),
    
    # Customers
    path('customers/', views.CustomerListView.as_view(), name='customer_list'),
    path('customers/<int:customer_id>/data/', views.get_customer_data, name='customer_data'),
    path('customers/search/', views.search_customers, name='customer_search'),
    path('customers/<int:customer_id>/delete/', views.delete_customer, name='customer_delete'),
    
    # Materials
    path('materials/', views.MaterialListView.as_view(), name='material_list'),
    path('materials/<int:material_id>/data/', views.get_material_data, name='material_data'),
    path('materials/<int:material_id>/price/', views.get_material_current_price, name='material_price'),
    path('materials/delete/', views.delete_materials, name='material_delete'),
    
    # Budgets
    #path('budgets/', include('budget.urls', namespace='budget')),
    path('budgets/', views.BudgetListView.as_view(), name='budget_list'),
    path('budgets/create/', views.BudgetCreateView.as_view(), name='budget_create'),
    path('budgets/<int:pk>/edit/', views.BudgetEditView.as_view(), name='budget_edit'),
    path('budgets/<int:pk>/delete/', views.BudgetDeleteView.as_view(), name='budget_delete'),
    path('budgets/<int:pk>/pdf/', views.BudgetPDFView.as_view(), name='budget_pdf'),
    
    # Taxes
    path('taxes/', views.tax_list, name='tax_list'),
    path('taxes/create/', views.tax_create, name='tax_create'),
    path('taxes/<int:pk>/update/', views.tax_update, name='tax_update'),
    path('taxes/<int:pk>/delete/', views.tax_delete, name='tax_delete'),
    
    # Price Lists
    path('price-lists/', views.PriceListView.as_view(), name='price_list'),
    path('price-lists/<int:pk>/data/', views.price_list_data, name='price_list_data'),
    path('price-lists/<int:pk>/delete/', views.delete_price_list, name='price_list_delete'),
    
    # Workflow Views
    path('pending-budgets/', views.PendingBudgetsView.as_view(), name='pending_budgets'),
    path('awaiting-acceptance/', views.AwaitingAcceptanceView.as_view(), name='awaiting_acceptance'),
    path('installation-scheduling/', views.InstallationSchedulingView.as_view(), name='installation_scheduling'),
    path('installations/', views.InstallationsView.as_view(), name='installations'),
]