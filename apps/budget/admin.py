from django.contrib import admin
from .models import Customer, Budget, BudgetItem, Material

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'document', 'customer_type', 'phone', 'email', 'enabled')
    list_filter = ('customer_type', 'enabled', 'created_at')
    search_fields = ('name', 'document', 'email')

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'created_at', 'status', 'total_cost', 'enabled')
    list_filter = ('status', 'created_at')
    search_fields = ('customer__name', 'id')
    
    def total_cost(self, obj):
        return f"R$ {obj.total_cost:.2f}"
    total_cost.short_description = "Custo Total"

@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    list_display = ('budget', 'material', 'quantity', 'enabled')
    list_filter = ('budget__status',)
    search_fields = ('budget__customer__name', 'material__full_name')

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'nick_name', 'cost_value', 'active')
    list_filter = ('active',)
    search_fields = ('full_name', 'nick_name')