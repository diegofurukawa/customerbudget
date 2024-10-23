from django import forms
from .models import Customer, Material, Budget, BudgetItem, Tax, Price_List
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q


class CustomerForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = ['name', 'document', 'customer_type', 'birth_date', 'phone', 'email', 'address', 'address_complement', 'enabled']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'document': forms.TextInput(attrs={'class': 'form-control'}),
            'customer_type': forms.Select(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'address': forms.TextInput(attrs={'class': 'form-control'}),
            'address_complement': forms.TextInput(attrs={'class': 'form-control'}),
            'enabled': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['customer_type'].widget = forms.RadioSelect(choices=Customer.PERSON_TYPE_CHOICES)
        self.fields['customer_type'].initial = 1  # Define o valor padrão como 'Física'

class MaterialForm(forms.ModelForm):
    class Meta:
        model = Material
        fields = ['full_name', 'nick_name', 'description', 'ean_code', 'active']
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-control'}),
            'nick_name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'ean_code': forms.TextInput(attrs={'class': 'form-control'}),
            'active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

class CustomerSearchForm(forms.Form):
    search = forms.CharField(required=False, label='Pesquisar Cliente')

class TaxForm(forms.ModelForm):
    class Meta:
        model = Tax
        fields = ['description', 'type', 'acronym', 'group', 'calc_operator', 'value', 'enabled']
        widgets = {
            'description': forms.TextInput(attrs={'class': 'form-control'}),
            'type': forms.Select(attrs={'class': 'form-control'}),
            'acronym': forms.TextInput(attrs={'class': 'form-control'}),
            'group': forms.Select(attrs={'class': 'form-control'}),
            'calc_operator': forms.Select(attrs={'class': 'form-control'}),
            'value': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.0001'}),
            'enabled': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

class PriceListForm(forms.ModelForm):
    class Meta:
        model = Price_List
        fields = ['material', 'value', 'tax', 'type_tax', 'start_date', 'end_date', 'active']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
        }

class BudgetItemForm(forms.ModelForm):
    class Meta:
        model = BudgetItem
        fields = ['material', 'quantity']
        widgets = {
            'material': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0.01'
            }),
        }

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        # Get current price for the material
        current_price = Price_List.objects.filter(
            material=instance.material,
            active=True,
            start_date__lte=timezone.now().date()
        ).filter(
            Q(end_date__gte=timezone.now().date()) | 
            Q(end_date__isnull=True)
        ).order_by('-start_date').first()

        if current_price:
            instance.value = current_price.value
            instance.tax_value = current_price.tax_value
            instance.value_total = current_price.value_total * instance.quantity
        else:
            raise ValidationError(
                f"No valid price found for material: {instance.material.full_name}"
            )

        if commit:
            instance.save()
        return instance

class BudgetForm(forms.ModelForm):
    class Meta:
        model = Budget
        fields = ['customer', 'status']
        widgets = {
            'customer': forms.HiddenInput(),
            'status': forms.HiddenInput(),
        }

    def save(self, commit=True):
        instance = super().save(commit=False)
        
        if commit:
            instance.save()
            # Update budget totals based on all active items
            instance.update_total_values()
        
        return instance

# Create the formset after defining the form
BudgetItemFormSet = forms.inlineformset_factory(
    Budget, 
    BudgetItem,
    form=BudgetItemForm,
    extra=1,
    can_delete=True
)