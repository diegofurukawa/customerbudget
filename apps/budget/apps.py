from django.apps import AppConfig

class BudgetConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.budget'
    #label = 'budget'
    verbose_name = 'Orçamentos'

# apps/budget/apps.py
# from django.apps import AppConfig

# class BudgetConfig(AppConfig):
#     default_auto_field = 'django.db.models.BigAutoField'
#     name = 'apps.budget'  # Caminho completo para o app
#     label = 'budget_app'  # Label único para evitar conflitos
#     verbose_name = 'Budget Management'