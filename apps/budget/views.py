from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib import messages
from django.db.models import Q, Sum, F, FloatField
from django.http import JsonResponse
from .models import Customer, Material
from .forms import CustomerForm, MaterialForm, BudgetForm, BudgetItemFormSet, Budget, CustomerSearchForm
from .models import Budget, Customer, Material, BudgetItem
from django.views.generic import ListView
from django.db.models.functions import Coalesce
from django.db import transaction

def home(request):
    total_customers = Customer.objects.count()
    pending_quotes = 0  # Você precisará implementar esta lógica
    context = {
        'total_customers': total_customers,
        'pending_quotes': pending_quotes,
    }
    return render(request, 'home.html', context)

class CustomerListView(View):
    def get(self, request):
        search_query = request.GET.get('search', '')
        if search_query:
            customers = Customer.objects.filter(
                Q(name__icontains=search_query) |
                Q(cpf__icontains=search_query) |
                Q(cnpj__icontains=search_query)
            )
        else:
            customers = Customer.objects.all()
        form = CustomerForm()
        return render(request, 'budget/customer_list.html', {'customers': customers, 'form': form})

    def post(self, request):
        customer_id = request.POST.get('customer_id')
        if customer_id:
            customer = get_object_or_404(Customer, id=customer_id)
            form = CustomerForm(request.POST, instance=customer)
        else:
            form = CustomerForm(request.POST)

        if form.is_valid():
            form.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'errors': form.errors})

def get_customer_data(request, customer_id):
    customer = get_object_or_404(Customer, id=customer_id)
    data = {
        'id': customer.id,
        'name': customer.name,
        'document': customer.document,
        'customer_type': customer.customer_type,
        'birth_date': customer.birth_date.isoformat() if customer.birth_date else '',
        'phone': customer.phone,
        'email': customer.email,
        'address': customer.address,
        'address_complement': customer.address_complement,
    }
    return JsonResponse(data)

def search_customers(request):
    term = request.GET.get('term', '')
    customers = Customer.objects.filter(
        Q(name__icontains=term) | Q(document__icontains=term)
    )[:10]  # Limita a 10 resultados
    data = list(customers.values('id', 'name', 'phone', 'document'))
    return JsonResponse(data, safe=False)

# Placeholder views for other menu items
def agendamento(request):
    return render(request, 'budget/agendamento.html')

def material(request):
    return render(request, 'budget/material.html')

def orcamento(request):
    return render(request, 'budget/orcamento.html')

def pendentes_aceite(request):
    return render(request, 'budget/pendentes_aceite.html')

def cadastros_gerais(request):
    return render(request, 'budget/cadastros_gerais.html')

def usuarios(request):
    return render(request, 'budget/usuarios.html')


class MaterialListView(View):
    def get(self, request):
        materials = Material.objects.all()
        form = MaterialForm()
        return render(request, 'budget/material_list.html', {'materials': materials, 'form': form})

    def post(self, request):
        material_id = request.POST.get('material_id')
        if material_id:
            material = get_object_or_404(Material, id=material_id)
            form = MaterialForm(request.POST, instance=material)
        else:
            form = MaterialForm(request.POST)

        if form.is_valid():
            form.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'errors': form.errors})

def get_material_data(request, material_id):
    material = get_object_or_404(Material, id=material_id)
    data = {
        'id': material.id,
        'full_name': material.full_name,
        'nick_name': material.nick_name,
        'description': material.description,
        'cost_value': str(material.cost_value),  # Convert to string for JSON serialization
        'active': material.active,
    }
    return JsonResponse(data)


class BudgetListView(ListView):
    model = Budget
    template_name = 'budget/budget_list.html'
    context_object_name = 'budgets'
    paginate_by = 10  # Número de itens por página

    def get_queryset(self):
        order_by = self.request.GET.get('order_by', '-created_at')
        queryset = Budget.objects.filter(status='CREATED').annotate(
            total_cost=Coalesce(Sum(F('items__quantity') * F('items__material__cost_value'), output_field=FloatField()), 0.0)
        ).order_by(order_by)
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['order_by'] = self.request.GET.get('order_by', '-created_at')
        return context

class BudgetCreateView(View):
    def get(self, request):
        form = BudgetForm()
        item_formset = BudgetItemFormSet(prefix='items')
        materials = Material.objects.all()
        return render(request, 'budget/budget_form.html', {
            'form': form,
            'item_formset': item_formset,
            'materials': materials,
        })

    def post(self, request):
        form = BudgetForm(request.POST)
        item_formset = BudgetItemFormSet(request.POST, prefix='items')
        
        if form.is_valid() and item_formset.is_valid():
            try:
                with transaction.atomic():
                    budget = form.save()
                    instances = item_formset.save(commit=False)
                    for instance in instances:
                        instance.budget = budget
                        instance.save()
                    messages.success(request, 'Orçamento criado com sucesso!')
                    return redirect('budget_list')
            except Exception as e:
                messages.error(request, f'Erro ao salvar o orçamento: {str(e)}')
        else:
            if not form.is_valid():
                messages.error(request, f'Erros no formulário principal: {form.errors}')
            if not item_formset.is_valid():
                messages.error(request, f'Erros no formset de itens: {item_formset.errors}')
        
        materials = Material.objects.all()
        return render(request, 'budget/budget_form.html', {
            'form': form,
            'item_formset': item_formset,
            'materials': materials,
        })

class BudgetEditView(View):
    def get(self, request, pk):
        budget = get_object_or_404(Budget, pk=pk)
        if budget.status != 'CREATED':
            messages.error(request, "Apenas orçamentos com status 'Criado' podem ser editados.")
            return redirect('budget_list')
        
        form = BudgetForm(instance=budget)
        item_formset = BudgetItemFormSet(instance=budget)
        materials = Material.objects.all()
        return render(request, 'budget/budget_form.html', {
            'form': form,
            'item_formset': item_formset,
            'materials': materials,
            'edit_mode': True,
            'budget': budget,
        })

    def post(self, request, pk):
        budget = get_object_or_404(Budget, pk=pk)
        if budget.status != 'CREATED':
            messages.error(request, "Apenas orçamentos com status 'Criado' podem ser editados.")
            return redirect('budget_list')

        form = BudgetForm(request.POST, instance=budget)
        item_formset = BudgetItemFormSet(request.POST, instance=budget)
        
        if form.is_valid() and item_formset.is_valid():
            form.save()
            item_formset.save()
            messages.success(request, 'Orçamento atualizado com sucesso!')
            return redirect('budget_list')
        
        materials = Material.objects.all()
        return render(request, 'budget/budget_form.html', {
            'form': form,
            'item_formset': item_formset,
            'materials': materials,
            'edit_mode': True,
            'budget': budget,
        })


    def post(self, request, pk):
        #budget = get_object_or_404(Budget, pk=pk, enabled=True)
        budget = get_object_or_404(Budget, pk=pk)
        form = BudgetForm(request.POST, instance=budget)
        if form.is_valid():
            budget = form.save()
            item_formset = BudgetItemFormSet(request.POST, instance=budget)
            if item_formset.is_valid():
                items = item_formset.save(commit=False)
                for item in items:
                    item.enabled = True
                    item.save()
                for item in item_formset.deleted_objects:
                    item.enabled = False
                    item.save()
                messages.success(request, 'Orçamento atualizado com sucesso!')
                return redirect('budget_list')
        else:
            item_formset = BudgetItemFormSet(request.POST, instance=budget)
        
        customer_search_form = CustomerSearchForm(request.POST)
        if customer_search_form.is_valid():
            search_query = customer_search_form.cleaned_data['search']
            customers = Customer.objects.filter(
                Q(name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone__icontains=search_query)
            )
        else:
            customers = Customer.objects.all()
        
        materials = Material.objects.all()
        return render(request, 'budget/budget_form.html', {
            'form': form,
            'item_formset': item_formset,
            'customer_search_form': customer_search_form,
            'customers': customers,
            'materials': materials,
            'edit_mode': True,
            'budget': budget,
        })

def remove_budget_item(request, pk):
    item = get_object_or_404(BudgetItem, pk=pk)
    item.enabled = False
    item.save()
    messages.success(request, 'Item removido com sucesso!')
    return redirect('budget_edit', pk=item.budget.pk)

def cancel_budget(request, pk):
    budget = get_object_or_404(Budget, pk=pk)
    budget.enabled = False
    budget.save()
    messages.success(request, 'Orçamento cancelado com sucesso!')
    return redirect('budget_list')