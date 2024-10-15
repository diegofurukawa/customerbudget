from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Q, Sum, F, FloatField, Count
from django.http import JsonResponse, HttpResponse
from .models import Customer, Material, Tax
from .forms import CustomerForm, MaterialForm, BudgetForm, BudgetItemFormSet, Budget, CustomerSearchForm, TaxForm
from .models import Budget, Customer, Material, BudgetItem
from django.views.generic import ListView, View
from django.db.models.functions import Coalesce, TruncDate
from django.db import transaction
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os
from django.contrib.staticfiles import finders
from io import BytesIO
import base64
from datetime import datetime, timedelta# Adicione esta importação
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.views.generic import TemplateView
from django import forms


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

    def get_queryset(self):
        return Budget.objects.annotate(
            total_value=Sum(F('items__quantity') * F('items__material__cost_value'))
        ).order_by('-created_at')

    def post(self, request, *args, **kwargs):
        budget_id = request.POST.get('budget_id')
        action = request.POST.get('action')
        
        if action == 'cancel':
            budget = get_object_or_404(Budget, id=budget_id, status='CREATED')
            budget.status = 'CANCELED'
            budget.save()
            return JsonResponse({'success': True, 'new_status': 'Cancelado'})
        
        return JsonResponse({'success': False, 'error': 'Ação inválida'})


class BudgetCreateView(View):
    def get(self, request):
        form = BudgetForm(initial={'status': 'CREATED'})
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
                    budget = form.save(commit=False)
                    if not budget.status:
                        budget.status = 'CREATED'
                    budget.save()
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



def generate_budget_pdf(request, budget_id):
    budget = Budget.objects.get(id=budget_id)
    items = BudgetItem.objects.filter(budget=budget)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=1)
    normal_style = styles['Normal']
    normal_style.alignment = 1  # Centralizado

    # Logo
    logo_filename = 'images/forja_logo.png'
    logo_path = finders.find(logo_filename)
    if not logo_path:
        logo_path = os.path.join(settings.MEDIA_ROOT, logo_filename)
    if not os.path.exists(logo_path):
        logo_path = os.path.join(settings.BASE_DIR, 'static', logo_filename)

    if os.path.exists(logo_path):
        logo = Image(logo_path, width=2*inch, height=2*inch)
        elements.append(logo)
    else:
        elements.append(Paragraph("Logo não encontrado", normal_style))

    # Adicionar um parágrafo entre o logo e o header_text
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("FORJA DE AÇO - ORÇAMENTO", title_style))
    #elements.append(Spacer(1, 12))

    # Cabeçalho com informações da empresa (cada informação em uma linha separada)
    header_text = f"""
    {settings.COMPANY_NAME}<br/>
    {settings.DOCUMENT_TYPE}: {settings.DOCUMENT_NUMBER}<br/>
    {settings.RESPONSIBLE}<br/>
    {settings.CONTACT}<br/>
    {settings.ADDRESS}
    """
    elements.append(Paragraph(header_text, normal_style))
    elements.append(Spacer(1, 12))

    # Informações do cliente
    elements.append(Paragraph(f"Cliente: {budget.customer.name}", normal_style))
    elements.append(Paragraph(f"Endereço: {budget.customer.address}", normal_style))
    elements.append(Spacer(1, 12))

    # Itens do orçamento
    data = [['Item', 'Quantidade', 'Valor Unitário', 'Valor Total']]
    total = 0
    for item in items:
        valor_total = item.quantity * item.material.cost_value
        data.append([
            item.material.full_name,
            str(item.quantity),
            f"R$ {item.material.cost_value:.2f}",
            f"R$ {valor_total:.2f}"
        ])
        total += valor_total

    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))

    elements.append(table)
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"TOTAL DO ORÇAMENTO: R$ {total:.2f}", styles['Heading2']))

    # Informações adicionais
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("PRAZO DE ENTREGA: 27 dias úteis", normal_style))
    elements.append(Paragraph("FORMA DE PAGAMENTO: Em até 10x no cartão de crédito", normal_style))
    elements.append(Paragraph("Elaboração de contrato após aceite de orçamento.", normal_style))

    # Construa o PDF
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()

    # Preparar a resposta
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="orcamento_{budget.id}.pdf"'
    response.write(pdf)

    return response



class BudgetPDFPreviewView(View):
    def get(self, request, budget_id):
        # Reutilize a lógica de geração de PDF da função generate_budget_pdf
        pdf_content = generate_budget_pdf(request, budget_id).content
        
        # Converta o conteúdo PDF para base64
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
        
        # Renderize um template HTML que exibe o PDF usando um objeto <embed>
        html_content = f'''
        <html>
        <body>
            <embed src="data:application/pdf;base64,{pdf_base64}" width="100%" height="100%" type="application/pdf">
        </body>
        </html>
        '''
        return HttpResponse(html_content)
    
class PendingBudgetsView(ListView):
    model = Budget
    template_name = 'budget/pending_budgets.html'
    context_object_name = 'budgets'

    def get_queryset(self):
        return Budget.objects.filter(status='CREATED', enabled=True).annotate(
            total_value=Sum(F('items__quantity') * F('items__material__cost_value'))
        ).order_by('-created_at')

    def post(self, request, *args, **kwargs):
        budget_id = request.POST.get('budget_id')
        action = request.POST.get('action')
        
        if action == 'mark_sent':
            budget = get_object_or_404(Budget, id=budget_id, status='CREATED', enabled=True)
            budget.status = 'SENT'
            budget.save()
            return JsonResponse({'success': True, 'new_status': 'Enviado'})
        
        return JsonResponse({'success': False, 'error': 'Ação inválida'})
    

class AwaitingAcceptanceView(ListView):
    model = Budget
    template_name = 'budget/awaiting_acceptance.html'
    context_object_name = 'budgets'

    def get_queryset(self):
        return Budget.objects.filter(status='SENT', enabled=True).annotate(
            total_value=Sum(F('items__quantity') * F('items__material__cost_value'))
        ).order_by('-created_at')

    def post(self, request, *args, **kwargs):
        budget_id = request.POST.get('budget_id')
        action = request.POST.get('action')
        
        if action == 'generate_order':
            budget = get_object_or_404(Budget, id=budget_id, status='SENT', enabled=True)
            budget.status = 'SERVICE_ORDER'
            budget.save()
            return JsonResponse({'success': True, 'new_status': 'Ordem de Serviço'})
        
        return JsonResponse({'success': False, 'error': 'Ação inválida'})
    
class InstallationSchedulingView(ListView):
    model = Budget
    template_name = 'budget/installation_scheduling.html'
    context_object_name = 'budgets'

    def get_queryset(self):
        return Budget.objects.filter(status='SERVICE_ORDER', enabled=True).annotate(
            total_value=Sum(F('items__quantity') * F('items__material__cost_value'))
        ).order_by('-created_at')

    def post(self, request, *args, **kwargs):
        budget_id = request.POST.get('budget_id')
        installation_date = request.POST.get('installation_date')
        
        try:
            budget = get_object_or_404(Budget, id=budget_id, status='SERVICE_ORDER', enabled=True)
            parsed_date = datetime.strptime(installation_date, '%Y-%m-%d').date()
            
            if parsed_date < datetime.now().date():
                raise ValidationError("A data de instalação não pode ser no passado.")
            
            budget.installation_date = parsed_date
            budget.status = 'SCHEDULED'
            budget.save()
            return JsonResponse({'success': True, 'new_status': 'Agendado', 'installation_date': installation_date})
        except ValidationError as ve:
            return JsonResponse({'success': False, 'error': str(ve)})
        except ValueError:
            return JsonResponse({'success': False, 'error': "Formato de data inválido."})
        except Exception as e:
            return JsonResponse({'success': False, 'error': f"Erro inesperado: {str(e)}"})
        
class InstallationsView(ListView):
    model = Budget
    template_name = 'budget/installations.html'
    context_object_name = 'installations'

    def get_queryset(self):
        return Budget.objects.filter(status='SCHEDULED', enabled=True).annotate(
            total_value=Sum(F('items__quantity') * F('items__material__cost_value'))
        ).order_by('installation_date')
    
class DashboardView(TemplateView):
    template_name = 'budget/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        one_month_ago = timezone.now() - timedelta(days=30)

        # 1. Orçamentos criados
        created_budgets = Budget.objects.filter(created_at__gte=one_month_ago, enabled=True)
        context['created_count'] = created_budgets.count()
        context['created_total'] = created_budgets.aggregate(
            total=Sum(F('items__quantity') * F('items__material__cost_value'))
        )['total'] or 0

        # 2. Orçamentos aceitos
        accepted_statuses = ['ACCEPTED', 'SERVICE_ORDER', 'SCHEDULED']
        accepted_budgets = Budget.objects.filter(
            created_at__gte=one_month_ago,
            enabled=True,
            status__in=accepted_statuses
        )
        context['accepted_count'] = accepted_budgets.count()
        context['accepted_total'] = accepted_budgets.aggregate(
            total=Sum(F('items__quantity') * F('items__material__cost_value'))
        )['total'] or 0

        # 3. Total Faturado
        faturado_statuses = ['SERVICE_ORDER', 'SCHEDULED']
        faturado_budgets = Budget.objects.filter(
            created_at__gte=one_month_ago,
            enabled=True,
            status__in=faturado_statuses
        )
        context['faturado_total'] = faturado_budgets.aggregate(
            total=Sum(F('items__quantity') * F('items__material__cost_value'))
        )['total'] or 0

        # 4. Comparação de Orçamentos (Time Series)
        base_series = Budget.objects.filter(
            created_at__gte=one_month_ago,
            enabled=True
        ).annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id')).order_by('date')

        status_series = {
            'PENDING': [],
            'SENT': [],
            'ACCEPTED': [],
            'SERVICE_ORDER': [],
            'SCHEDULED': []
        }

        for status in status_series.keys():
            status_data = Budget.objects.filter(
                created_at__gte=one_month_ago,
                enabled=True,
                status=status
            ).annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id')).order_by('date')
            
            status_series[status] = list(status_data)

        context['time_series_data'] = {
            'base': list(base_series),
            'status_series': status_series
        }

        return context
    
class BudgetForm(forms.ModelForm):
    class Meta:
        model = Budget
        fields = ['customer', 'status']
        widgets = {
            'customer': forms.HiddenInput(),
            'status': forms.HiddenInput(),
        }

class BudgetItemForm(forms.ModelForm):
    class Meta:
        model = BudgetItem
        fields = ['material', 'quantity']
        widgets = {
            'material': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': '0.01'}),
        }

BudgetItemFormSet = forms.inlineformset_factory(
    Budget, BudgetItem, form=BudgetItemForm, extra=1, can_delete=True
)


def budget_create_edit(request, pk=None):
    budget = None
    if pk:
        budget = get_object_or_404(Budget, pk=pk)

    if request.method == 'POST':
        form = BudgetForm(request.POST, instance=budget)
        if form.is_valid():
            budget = form.save(commit=False)
            if not budget.pk:
                budget.status = 'CREATED'
            formset = BudgetItemFormSet(request.POST, instance=budget)
            if formset.is_valid():
                budget.save()
                formset.save()
                action = 'atualizado' if pk else 'criado'
                messages.success(request, f'Orçamento {action} com sucesso!')
                return redirect('budget_list')
        else:
            formset = BudgetItemFormSet(request.POST, instance=budget)
    else:
        form = BudgetForm(instance=budget)
        if not budget:
            form.initial['status'] = 'CREATED'
        formset = BudgetItemFormSet(instance=budget)

    materials = Material.objects.filter(active=True)
    context = {
        'form': form,
        'item_formset': formset,
        'materials': materials,
        'edit_mode': budget is not None
    }
    return render(request, 'budget/budget_form.html', context)

def budget_list(request):
    budgets = Budget.objects.all()
    return render(request, 'budget/budget_list.html', {'budgets': budgets})

def budget_create(request):
    if request.method == 'POST':
        form = BudgetForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('budget_list')
    else:
        form = BudgetForm()
    return render(request, 'budget/budget_form.html', {'form': form})

def budget_edit(request, pk):
    budget = get_object_or_404(Budget, pk=pk)
    if request.method == 'POST':
        form = BudgetForm(request.POST, instance=budget)
        if form.is_valid():
            form.save()
            return redirect('budget_list')
    else:
        form = BudgetForm(instance=budget)
    return render(request, 'budget/budget_form.html', {'form': form, 'edit_mode': True})

class HomeView(TemplateView):
    template_name = 'home.html'


def tax_list(request):
    taxes = Tax.objects.all()
    form = TaxForm()
    return render(request, 'budget/tax_list.html', {'taxes': taxes, 'form': form})

def tax_create(request):
    if request.method == 'POST':
        form = TaxForm(request.POST)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'errors': form.errors})
    return JsonResponse({'success': False, 'errors': 'Invalid request method'})

def tax_update(request, pk):
    tax = get_object_or_404(Tax, pk=pk)
    if request.method == 'POST':
        form = TaxForm(request.POST, instance=tax)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'errors': form.errors})
    elif request.method == 'GET':
        return JsonResponse({
            'id': tax.id,
            'description': tax.description,
            'type': tax.type,
            'acronym': tax.acronym,
            'group': tax.group,
            'calc_operator': tax.calc_operator,
            'value': str(tax.value),
            'enabled': tax.enabled,
        })
    return JsonResponse({'success': False, 'errors': 'Invalid request method'})

def tax_delete(request, pk):
    tax = get_object_or_404(Tax, pk=pk)
    tax.delete()
    messages.success(request, 'Taxa/Imposto excluído com sucesso.')
    return redirect('tax_list')