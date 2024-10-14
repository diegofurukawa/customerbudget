from django.urls import path
from . import views

urlpatterns = [
    path('list/', views.budget_list, name='budget_list'),
    path('create/', views.budget_create, name='budget_create'),
    path('edit/<int:pk>/', views.budget_edit, name='budget_edit'),
    # Adicione outras URLs específicas do orçamento aqui
]