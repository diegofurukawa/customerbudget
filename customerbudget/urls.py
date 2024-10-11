from django.contrib import admin
from django.urls import path
from apps.budget.views import (
    home, CustomerListView, get_customer_data, 
    MaterialListView, get_material_data,
    BudgetCreateView, BudgetListView, BudgetEditView
    ,remove_budget_item, cancel_budget, search_customers
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name='dashboard'),
    path('customers/', CustomerListView.as_view(), name='customer_list'),
    path('customers/<int:customer_id>/data/', get_customer_data, name='get_customer_data'),
    path('search-customers/', search_customers, name='search_customers'),
    path('materials/', MaterialListView.as_view(), name='material_list'),
    path('materials/<int:material_id>/data/', get_material_data, name='get_material_data'),
    path('budgets/', BudgetListView.as_view(), name='budget_list'),
    path('budgets/create/', BudgetCreateView.as_view(), name='budget_create'),
    path('budgets/<int:pk>/edit/', BudgetEditView.as_view(), name='budget_edit'),
    path('budgets/item/<int:pk>/remove/', remove_budget_item, name='remove_budget_item'),
    path('budgets/<int:pk>/cancel/', cancel_budget, name='cancel_budget'),
    # Adicione URLs para as outras páginas conforme necessário
    path('agendamento/', home, name='agendamento'),  # Placeholder
    path('orcamento/', home, name='orcamento'),  # Placeholder
    path('pendentes-aceite/', home, name='pendentes_aceite'),  # Placeholder
    path('cadastros-gerais/', home, name='cadastros_gerais'),  # Placeholder
    path('usuarios/', home, name='usuarios'),  # Placeholder
]