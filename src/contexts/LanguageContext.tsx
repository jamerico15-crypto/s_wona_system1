import { createContext, useState, useEffect, type ReactNode } from 'react';

export type Language = 'pt' | 'en';

const STORAGE_KEY = 'mcl-language';

export type TranslationKey =
  | 'login.email'
  | 'login.password'
  | 'login.submit'
  | 'login.submitting'
  | 'login.locked'
  | 'login.lockedDesc'
  | 'login.useCredentials'
  | 'login.attemptOf'
  | 'login.remainingAttempts'
  | 'login.remainingAttempt'
  | 'login.attemptsBeforeLock'
  | 'login.attemptBeforeLock'
  | 'login.loginSuccess'
  | 'login.loginFailed'
  | 'login.emailPlaceholder'
  | 'login.passwordPlaceholder'
  | 'sidebar.appName'
  | 'sidebar.appSubtitle'
  | 'sidebar.backToAdmin'
  | 'sidebar.selectProject'
  | 'sidebar.dashboard'
  | 'sidebar.tableConfig'
  | 'sidebar.visibility'
  | 'sidebar.reports'
  | 'sidebar.searchTables'
  | 'sidebar.noTables'
  | 'sidebar.projectTables'
  | 'sidebar.otherTables'
  | 'sidebar.noTableFound'
  | 'sidebar.logout'
  | 'sidebar.expandMenu'
  | 'sidebar.collapseMenu'
  | 'sidebar.closeMenu'
  | 'sidebar.openMenu'
  | 'sidebar.role.superAdmin'
  | 'sidebar.role.admin'
  | 'sidebar.role.editor'
  | 'sidebar.role.leitor'
  | 'visibility.title'
  | 'visibility.subtitle'
  | 'visibility.density'
  | 'visibility.compact'
  | 'visibility.comfortable'
  | 'visibility.showAll'
  | 'visibility.hideAll'
  | 'visibility.showAllShort'
  | 'visibility.hideAllShort'
  | 'visibility.searchTables'
  | 'visibility.searchFields'
  | 'visibility.noTablesFound'
  | 'visibility.selectTable'
  | 'visibility.selectTableDesc'
  | 'visibility.errorLoadingFields'
  | 'visibility.tryAgain'
  | 'visibility.fieldCount'
  | 'visibility.hiddenCount'
  | 'visibility.noFieldsFound'
  | 'visibility.noFields'
  | 'visibility.colField'
  | 'visibility.colType'
  | 'visibility.colStatus'
  | 'visibility.tableHidden'
  | 'visibility.tableVisible'
  | 'visibility.fieldHidden'
  | 'visibility.fieldVisible'
  | 'visibility.allFieldsVisible'
  | 'visibility.allFieldsHidden'
  | 'visibility.tablesCount'
  | 'visibility.tablesCountSingular'
  | 'table.addRecord'
  | 'table.addRecordShort'
  | 'table.refresh'
  | 'table.edit'
  | 'table.delete'
  | 'table.deleteRecord'
  | 'table.confirmDelete'
  | 'table.recordDeleted'
  | 'table.recordCreated'
  | 'table.recordUpdated'
  | 'table.save'
  | 'table.cancel'
  | 'table.create'
  | 'table.editRecord'
  | 'table.addRecordTitle'
  | 'table.columns'
  | 'table.noData'
  | 'table.loading'
  | 'table.page'
  | 'table.of'
  | 'table.next'
  | 'table.prev'
  | 'table.records'
  | 'table.recordsSingular'
  | 'table.searchPlaceholder'
  | 'admin.title'
  | 'admin.subtitle'
  | 'admin.projectsTitle'
  | 'admin.projectsDesc'
  | 'admin.refresh'
  | 'admin.customize'
  | 'admin.manageUsers'
  | 'admin.manageUsersShort'
  | 'admin.createProject'
  | 'admin.createProjectShort'
  | 'admin.logout'
  | 'admin.totalProjects'
  | 'admin.activeProjects'
  | 'admin.pausedProjects'
  | 'admin.completedProjects'
  | 'admin.selectProjectPrompt'
  | 'admin.selectProjectDesc'
  | 'admin.createProjectTitle'
  | 'admin.createProjectLabel'
  | 'admin.manageUsersTitle'
  | 'admin.manageUsersDesc'
  | 'admin.projectName'
  | 'admin.projectDescription'
  | 'admin.projectStatus'
  | 'admin.statusActive'
  | 'admin.statusPaused'
  | 'admin.statusCompleted'
  | 'admin.save'
  | 'admin.cancel'
  | 'admin.enterProject'
  | 'lang.switch'
  | 'admin.tabProjects'
  | 'admin.tabVisibility'
  | 'admin.tabSettings'
  | 'admin.settingsTitle'
  | 'admin.settingsDesc'
  | 'admin.usersTitle'
  | 'admin.usersDesc'
  | 'admin.brandingTitle'
  | 'admin.brandingDesc'
  | 'admin.role'
  | 'admin.user'
  | 'admin.userEmail'
  | 'admin.crudMatrix'
  | 'admin.crudCreate'
  | 'admin.crudRead'
  | 'admin.crudUpdate'
  | 'admin.crudDelete'
  | 'admin.crudCollections'
  | 'admin.crudAll'
  | 'admin.crudNone'
  | 'admin.crudPartial'
  | 'admin.loadingRoles'
  | 'admin.loadingPermissions'
  | 'admin.noPermissions'
  | 'admin.roleUpdated'
  | 'admin.roleUpdateFailed'
  | 'admin.syncingRole'
  | 'admin.confirmRoleChange'
  | 'security.accessDenied'
  | 'security.accessDeniedDesc'
  | 'security.backToProjects'
  | 'security.unauthorizedProject'
  | 'security.unauthorizedDesc'
  | 'form.required'
  | 'form.requiredField'
  | 'form.searchPlaceholder'
  | 'form.loadingOptions'
  | 'form.noResults'
  | 'form.selectOption'
  | 'form.validationError'
  | 'security.validationFailed'
  | 'security.validationFailedDesc'
  | 'security.invalidProject'
  | 'security.invalidProjectDesc'
  | 'reports.title'
  | 'reports.subtitle'
  | 'reports.selectTable'
  | 'reports.selectTableDesc'
  | 'reports.filters'
  | 'reports.dateFrom'
  | 'reports.dateTo'
  | 'reports.filterValue'
  | 'reports.filterField'
  | 'reports.addFilter'
  | 'reports.removeFilter'
  | 'reports.fields'
  | 'reports.fieldsDesc'
  | 'reports.selectAll'
  | 'reports.clearSelection'
  | 'reports.selectedCount'
  | 'reports.narrative'
  | 'reports.narrativeDesc'
  | 'reports.narrativePlaceholder'
  | 'reports.includeCharts'
  | 'reports.chartsDesc'
  | 'reports.generate'
  | 'reports.generateExcel'
  | 'reports.generateWord'
  | 'reports.generatePdf'
  | 'reports.generating'
  | 'reports.noFields'
  | 'reports.noTableSelected'
  | 'reports.loadingFields'
  | 'reports.loadingData'
  | 'reports.error'
  | 'reports.errorLoadingFields'
  | 'reports.errorLoadingData'
  | 'reports.success'
  | 'reports.reportGenerated'
  | 'reports.noDataFiltered'
  | 'reports.tooManyRecords'
  | 'reports.tooManyRecordsDesc'
  | 'reports.preview'
  | 'reports.recordsCount'
  | 'reports.recordsCountSingular'
  | 'reports.reportTitle'
  | 'reports.reportDate'
  | 'reports.page'
  | 'reports.preparedBy'
  | 'reports.chartsIncluded'
  | 'reports.noChartsAvailable';

type Translations = Record<TranslationKey, string>;

const pt: Translations = {
  'login.email': 'Email',
  'login.password': 'Palavra-passe',
  'login.submit': 'Entrar',
  'login.submitting': 'A iniciar sessão...',
  'login.locked': 'Acesso bloqueado por excesso de tentativas falhadas.',
  'login.lockedDesc': 'Por razões de segurança, a sua sessão foi trancada. Por favor, contacte o Administrador de TI (IT Admin) para desbloquear a sua conta ou redefinir as suas credenciais.',
  'login.useCredentials': 'Use as suas credenciais da plataforma para entrar.',
  'login.attemptOf': 'Tentativa {n} de {max}.',
  'login.remainingAttempts': 'Restam {n} tentativas antes do bloqueio.',
  'login.remainingAttempt': 'Restam {n} tentativa antes do bloqueio.',
  'login.attemptsBeforeLock': 'antes do bloqueio.',
  'login.attemptBeforeLock': 'antes do bloqueio.',
  'login.loginSuccess': 'Sessão iniciada com sucesso.',
  'login.loginFailed': 'Falha no início de sessão.',
  'login.emailPlaceholder': 'o.seu@email.com',
  'login.passwordPlaceholder': '••••••••',
  'sidebar.appName': 'Missão Contra a Lepra',
  'sidebar.appSubtitle': 'Sistema de MERL · Moçambique',
  'sidebar.backToAdmin': 'Voltar à Página Principal',
  'sidebar.selectProject': 'Selecionar projeto',
  'sidebar.dashboard': 'Dashboard Analítico',
  'sidebar.tableConfig': 'Configuração · Tabelas',
  'sidebar.visibility': 'Visibilidade',
  'sidebar.reports': 'Central de Relatórios',
  'sidebar.searchTables': 'Pesquisar tabelas...',
  'sidebar.noTables': 'Sem tabelas',
  'sidebar.projectTables': 'Tabelas do Projeto',
  'sidebar.otherTables': 'Outras Tabelas',
  'sidebar.noTableFound': 'Nenhuma tabela encontrada.',
  'sidebar.logout': 'Terminar sessão',
  'sidebar.expandMenu': 'Expandir menu',
  'sidebar.collapseMenu': 'Colapsar menu',
  'sidebar.closeMenu': 'Fechar menu',
  'sidebar.openMenu': 'Abrir menu',
  'sidebar.role.superAdmin': 'Super Admin',
  'sidebar.role.admin': 'Administrador',
  'sidebar.role.editor': 'Editor',
  'sidebar.role.leitor': 'Leitor',
  'visibility.title': 'Visibilidade de Tabelas e Campos',
  'visibility.subtitle': 'Controle quais tabelas e campos aparecem na visualização de dados',
  'visibility.density': 'Densidade',
  'visibility.compact': 'Compacto',
  'visibility.comfortable': 'Confortável',
  'visibility.showAll': 'Mostrar todos',
  'visibility.hideAll': 'Ocultar todos',
  'visibility.showAllShort': 'Ver',
  'visibility.hideAllShort': 'Ocultar',
  'visibility.searchTables': 'Pesquisar tabelas...',
  'visibility.searchFields': 'Pesquisar campos...',
  'visibility.noTablesFound': 'Nenhuma tabela encontrada.',
  'visibility.selectTable': 'Selecione uma tabela',
  'visibility.selectTableDesc': 'Escolha uma tabela à esquerda para gerir a visibilidade dos seus campos.',
  'visibility.errorLoadingFields': 'Erro ao carregar campos',
  'visibility.tryAgain': 'Tentar novamente',
  'visibility.fieldCount': '{n} campo{s}',
  'visibility.hiddenCount': '{n} oculto{s}',
  'visibility.noFieldsFound': 'Nenhum campo encontrado.',
  'visibility.noFields': 'Esta tabela não tem campos.',
  'visibility.colField': 'Campo',
  'visibility.colType': 'Tipo',
  'visibility.colStatus': 'Estado',
  'visibility.tableHidden': 'Tabela "{name}" oculta.',
  'visibility.tableVisible': 'Tabela "{name}" agora visível.',
  'visibility.fieldHidden': 'Campo "{name}" oculto.',
  'visibility.fieldVisible': 'Campo "{name}" agora visível.',
  'visibility.allFieldsVisible': 'Todos os campos estão visíveis.',
  'visibility.allFieldsHidden': 'Todos os campos foram ocultados.',
  'visibility.tablesCount': '{n} tabelas',
  'visibility.tablesCountSingular': '{n} tabela',
  'table.addRecord': 'Adicionar Registo',
  'table.addRecordShort': 'Adicionar',
  'table.refresh': 'Atualizar',
  'table.edit': 'Editar',
  'table.delete': 'Eliminar',
  'table.deleteRecord': 'Eliminar registo',
  'table.confirmDelete': 'Tem a certeza que pretende eliminar este registo?',
  'table.recordDeleted': 'Registo eliminado com sucesso.',
  'table.recordCreated': 'Registo criado com sucesso.',
  'table.recordUpdated': 'Registo atualizado com sucesso.',
  'table.save': 'Guardar',
  'table.cancel': 'Cancelar',
  'table.create': 'Criar',
  'table.editRecord': 'Editar Registo',
  'table.addRecordTitle': 'Adicionar Registo',
  'table.columns': 'Colunas',
  'table.noData': 'Sem dados disponíveis.',
  'table.loading': 'A carregar...',
  'table.page': 'Página',
  'table.of': 'de',
  'table.next': 'Seguinte',
  'table.prev': 'Anterior',
  'table.records': 'registos',
  'table.recordsSingular': 'registo',
  'table.searchPlaceholder': 'Pesquisar...',
  'admin.title': 'Gestão Central de Projetos',
  'admin.subtitle': 'Missão Contra a Lepra · Moçambique',
  'admin.projectsTitle': 'Projetos do Sistema',
  'admin.projectsDesc': 'Selecione um projeto para aceder ao seu painel de dados',
  'admin.refresh': 'Atualizar',
  'admin.customize': 'Personalizar',
  'admin.manageUsers': 'Gerir Utilizadores',
  'admin.manageUsersShort': 'Utilizadores',
  'admin.createProject': 'Criar Novo Projeto',
  'admin.createProjectShort': 'Criar',
  'admin.logout': 'Terminar sessão',
  'admin.totalProjects': 'Total de Projetos',
  'admin.activeProjects': 'Projetos Ativos',
  'admin.pausedProjects': 'Projetos Pausados',
  'admin.completedProjects': 'Projetos Concluídos',
  'admin.selectProjectPrompt': 'Selecione um projeto',
  'admin.selectProjectDesc': 'Escolha um projeto na barra lateral para começar a visualizar os dados.',
  'admin.createProjectTitle': 'Criar Novo Projeto',
  'admin.createProjectLabel': 'Criar Projeto',
  'admin.manageUsersTitle': 'Gerir Utilizadores',
  'admin.manageUsersDesc': 'Os utilizadores e as suas permissões são geridos diretamente no NocoBase. Altere a função (Role) de cada utilizador abaixo — as permissões de acesso (Criar, Editar, Eliminar e Visualizar) são aplicadas em tempo real no backend.',
  'admin.projectName': 'Nome do Projeto',
  'admin.projectDescription': 'Descrição',
  'admin.projectStatus': 'Estado',
  'admin.statusActive': 'Ativo',
  'admin.statusPaused': 'Pausado',
  'admin.statusCompleted': 'Concluído',
  'admin.save': 'Guardar',
  'admin.cancel': 'Cancelar',
  'admin.enterProject': 'Entrar no Projeto',
  'lang.switch': 'Idioma',
  'admin.tabProjects': 'Projetos',
  'admin.tabVisibility': 'Visibilidade',
  'admin.tabSettings': 'Definições',
  'admin.settingsTitle': 'Definições do Sistema',
  'admin.settingsDesc': 'Gerir utilizadores, permissões e personalização visual',
  'admin.usersTitle': 'Gerir Utilizadores',
  'admin.usersDesc': 'Mapeamento exato das permissões do NocoBase. Altere a função de cada utilizador — as permissões CRUD são aplicadas em tempo real no backend.',
  'admin.brandingTitle': 'Personalizar Aparência',
  'admin.brandingDesc': 'Personalize o logótipo e textos do ecrã de login',
  'admin.role': 'Função',
  'admin.user': 'Utilizador',
  'admin.userEmail': 'Email',
  'admin.crudMatrix': 'Matriz de Privilégios (CRUD)',
  'admin.crudCreate': 'Criar',
  'admin.crudRead': 'Ler',
  'admin.crudUpdate': 'Atualizar',
  'admin.crudDelete': 'Eliminar',
  'admin.crudCollections': 'Coleções',
  'admin.crudAll': 'Todas as coleções',
  'admin.crudNone': 'Sem acesso',
  'admin.crudPartial': 'Coleções específicas',
  'admin.loadingRoles': 'A carregar funções...',
  'admin.loadingPermissions': 'A carregar permissões...',
  'admin.noPermissions': 'Sem permissões configuradas para esta função.',
  'admin.roleUpdated': 'Função atualizada no NocoBase com sucesso.',
  'admin.roleUpdateFailed': 'Falha ao atualizar a função no NocoBase.',
  'admin.syncingRole': 'A sincronizar...',
  'admin.confirmRoleChange': 'Tem a certeza que pretende alterar a função deste utilizador para "{role}"?',
  'security.accessDenied': 'Acesso Negado',
  'security.accessDeniedDesc': 'Não tem permissão para aceder a este projeto. O seu acesso está restrito aos projetos autorizados.',
  'security.backToProjects': 'Voltar aos Projetos Autorizados',
  'security.unauthorizedProject': 'Projeto Não Autorizado',
  'security.unauthorizedDesc': 'O projeto selecionado não está na sua lista de projetos autorizados. Por favor, selecione um projeto ao qual tenha acesso.',
  'form.required': 'Obrigatório',
  'form.requiredField': 'Este campo é obrigatório',
  'form.searchPlaceholder': 'Pesquisar...',
  'form.loadingOptions': 'A carregar opções...',
  'form.noResults': 'Nenhum resultado encontrado',
  'form.selectOption': 'Selecione uma opção',
  'form.validationError': 'Por favor, preencha todos os campos obrigatórios.',
  'security.validationFailed': 'Erro ao carregar o projeto',
  'security.validationFailedDesc': 'Não foi possível validar o acesso ao projeto. Por favor, verifique as suas permissões.',
  'security.invalidProject': 'Projeto Inválido',
  'security.invalidProjectDesc': 'O projeto selecionado não possui um identificador válido. Por favor, selecione outro projeto.',
  'reports.title': 'Central de Relatórios',
  'reports.subtitle': 'Gere e descarregue relatórios personalizados em Excel, Word e PDF',
  'reports.selectTable': 'Escolha a Tabela',
  'reports.selectTableDesc': 'Selecione a tabela de onde extrair os dados para o relatório',
  'reports.filters': 'Filtros Dinâmicos',
  'reports.dateFrom': 'Data de',
  'reports.dateTo': 'Data até',
  'reports.filterValue': 'Valor do filtro',
  'reports.filterField': 'Campo de filtro',
  'reports.addFilter': 'Adicionar filtro',
  'reports.removeFilter': 'Remover',
  'reports.fields': 'Seleção de Campos',
  'reports.fieldsDesc': 'Escolha exatamente quais colunas incluir no relatório',
  'reports.selectAll': 'Selecionar Todos',
  'reports.clearSelection': 'Limpar Seleção',
  'reports.selectedCount': '{n} de {total} campos selecionados',
  'reports.narrative': 'Narrativa do Relatório',
  'reports.narrativeDesc': 'Escreva uma introdução, conclusão ou análise executiva que será incluída no documento',
  'reports.narrativePlaceholder': 'Escreva a sua análise executiva aqui... Esta narrativa será inserida no início do relatório (Word e PDF).',
  'reports.includeCharts': 'Incluir Gráficos do Dashboard',
  'reports.chartsDesc': 'Os gráficos ativos do dashboard serão convertidos para imagens e inseridos no relatório',
  'reports.generate': 'Gerar Relatório',
  'reports.generateExcel': 'Excel (.xlsx)',
  'reports.generateWord': 'Word (.docx)',
  'reports.generatePdf': 'PDF (.pdf)',
  'reports.generating': 'A gerar {format}, por favor aguarde...',
  'reports.noFields': 'Nenhum campo disponível para esta tabela.',
  'reports.noTableSelected': 'Selecione uma tabela para começar.',
  'reports.loadingFields': 'A carregar campos...',
  'reports.loadingData': 'A carregar dados...',
  'reports.error': 'Erro',
  'reports.errorLoadingFields': 'Erro ao carregar os campos da tabela.',
  'reports.errorLoadingData': 'Erro ao carregar os dados. Verifique a ligação e tente novamente.',
  'reports.success': 'Sucesso',
  'reports.reportGenerated': 'Relatório gerado com sucesso.',
  'reports.noDataFiltered': 'Nenhum registo encontrado com os filtros aplicados.',
  'reports.tooManyRecords': 'Demasiados registos',
  'reports.tooManyRecordsDesc': 'O relatório tem mais de {n} registos. O ficheiro pode demorar a gerar. Continuar?',
  'reports.preview': 'Pré-visualização',
  'reports.recordsCount': '{n} registos',
  'reports.recordsCountSingular': '{n} registo',
  'reports.reportTitle': 'Relatório de {table}',
  'reports.reportDate': 'Data de Geração',
  'reports.page': 'Página',
  'reports.preparedBy': 'Preparado por',
  'reports.chartsIncluded': 'Gráficos incluídos',
  'reports.noChartsAvailable': 'Nenhum gráfico disponível no dashboard atual.',
};

const en: Translations = {
  'login.email': 'Email',
  'login.password': 'Password',
  'login.submit': 'Sign In',
  'login.submitting': 'Signing in...',
  'login.locked': 'Access locked due to too many failed attempts.',
  'login.lockedDesc': 'For security reasons, your session has been locked. Please contact the IT Administrator to unlock your account or reset your credentials.',
  'login.useCredentials': 'Use your platform credentials to sign in.',
  'login.attemptOf': 'Attempt {n} of {max}.',
  'login.remainingAttempts': '{n} attempts remaining before lockout.',
  'login.remainingAttempt': '{n} attempt remaining before lockout.',
  'login.attemptsBeforeLock': 'before lockout.',
  'login.attemptBeforeLock': 'before lockout.',
  'login.loginSuccess': 'Session started successfully.',
  'login.loginFailed': 'Sign in failed.',
  'login.emailPlaceholder': 'your@email.com',
  'login.passwordPlaceholder': '••••••••',
  'sidebar.appName': 'The Leprosy Mission',
  'sidebar.appSubtitle': 'M&E System · Mozambique',
  'sidebar.backToAdmin': 'Back to Admin Page',
  'sidebar.selectProject': 'Select project',
  'sidebar.dashboard': 'Analytics Dashboard',
  'sidebar.tableConfig': 'Settings · Tables',
  'sidebar.visibility': 'Visibility',
  'sidebar.reports': 'Report Center',
  'sidebar.searchTables': 'Search tables...',
  'sidebar.noTables': 'No tables',
  'sidebar.projectTables': 'Project Tables',
  'sidebar.otherTables': 'Other Tables',
  'sidebar.noTableFound': 'No tables found.',
  'sidebar.logout': 'Sign out',
  'sidebar.expandMenu': 'Expand menu',
  'sidebar.collapseMenu': 'Collapse menu',
  'sidebar.closeMenu': 'Close menu',
  'sidebar.openMenu': 'Open menu',
  'sidebar.role.superAdmin': 'Super Admin',
  'sidebar.role.admin': 'Administrator',
  'sidebar.role.editor': 'Editor',
  'sidebar.role.leitor': 'Viewer',
  'visibility.title': 'Table and Field Visibility',
  'visibility.subtitle': 'Control which tables and fields appear in the data view',
  'visibility.density': 'Density',
  'visibility.compact': 'Compact',
  'visibility.comfortable': 'Comfortable',
  'visibility.showAll': 'Show all',
  'visibility.hideAll': 'Hide all',
  'visibility.showAllShort': 'Show',
  'visibility.hideAllShort': 'Hide',
  'visibility.searchTables': 'Search tables...',
  'visibility.searchFields': 'Search fields...',
  'visibility.noTablesFound': 'No tables found.',
  'visibility.selectTable': 'Select a table',
  'visibility.selectTableDesc': 'Choose a table on the left to manage its field visibility.',
  'visibility.errorLoadingFields': 'Error loading fields',
  'visibility.tryAgain': 'Try again',
  'visibility.fieldCount': '{n} field{s}',
  'visibility.hiddenCount': '{n} hidden',
  'visibility.noFieldsFound': 'No fields found.',
  'visibility.noFields': 'This table has no fields.',
  'visibility.colField': 'Field',
  'visibility.colType': 'Type',
  'visibility.colStatus': 'Status',
  'visibility.tableHidden': 'Table "{name}" hidden.',
  'visibility.tableVisible': 'Table "{name}" now visible.',
  'visibility.fieldHidden': 'Field "{name}" hidden.',
  'visibility.fieldVisible': 'Field "{name}" now visible.',
  'visibility.allFieldsVisible': 'All fields are now visible.',
  'visibility.allFieldsHidden': 'All fields have been hidden.',
  'visibility.tablesCount': '{n} tables',
  'visibility.tablesCountSingular': '{n} table',
  'table.addRecord': 'Add Record',
  'table.addRecordShort': 'Add',
  'table.refresh': 'Refresh',
  'table.edit': 'Edit',
  'table.delete': 'Delete',
  'table.deleteRecord': 'Delete record',
  'table.confirmDelete': 'Are you sure you want to delete this record?',
  'table.recordDeleted': 'Record deleted successfully.',
  'table.recordCreated': 'Record created successfully.',
  'table.recordUpdated': 'Record updated successfully.',
  'table.save': 'Save',
  'table.cancel': 'Cancel',
  'table.create': 'Create',
  'table.editRecord': 'Edit Record',
  'table.addRecordTitle': 'Add Record',
  'table.columns': 'Columns',
  'table.noData': 'No data available.',
  'table.loading': 'Loading...',
  'table.page': 'Page',
  'table.of': 'of',
  'table.next': 'Next',
  'table.prev': 'Previous',
  'table.records': 'records',
  'table.recordsSingular': 'record',
  'table.searchPlaceholder': 'Search...',
  'admin.title': 'Central Project Management',
  'admin.subtitle': 'The Leprosy Mission · Mozambique',
  'admin.projectsTitle': 'System Projects',
  'admin.projectsDesc': 'Select a project to access its data panel',
  'admin.refresh': 'Refresh',
  'admin.customize': 'Customize',
  'admin.manageUsers': 'Manage Users',
  'admin.manageUsersShort': 'Users',
  'admin.createProject': 'Create New Project',
  'admin.createProjectShort': 'Create',
  'admin.logout': 'Sign out',
  'admin.totalProjects': 'Total Projects',
  'admin.activeProjects': 'Active Projects',
  'admin.pausedProjects': 'Paused Projects',
  'admin.completedProjects': 'Completed Projects',
  'admin.selectProjectPrompt': 'Select a project',
  'admin.selectProjectDesc': 'Choose a project in the sidebar to start viewing data.',
  'admin.createProjectTitle': 'Create New Project',
  'admin.createProjectLabel': 'Create Project',
  'admin.manageUsersTitle': 'Manage Users',
  'admin.manageUsersDesc': 'Users and their permissions are managed directly in NocoBase. Change each user\'s Role below — access permissions (Create, Edit, Delete and View) are applied in real time on the backend.',
  'admin.projectName': 'Project Name',
  'admin.projectDescription': 'Description',
  'admin.projectStatus': 'Status',
  'admin.statusActive': 'Active',
  'admin.statusPaused': 'Paused',
  'admin.statusCompleted': 'Completed',
  'admin.save': 'Save',
  'admin.cancel': 'Cancel',
  'admin.enterProject': 'Enter Project',
  'lang.switch': 'Language',
  'admin.tabProjects': 'Projects',
  'admin.tabVisibility': 'Visibility',
  'admin.tabSettings': 'Settings',
  'admin.settingsTitle': 'System Settings',
  'admin.settingsDesc': 'Manage users, permissions, and visual customization',
  'admin.usersTitle': 'Manage Users',
  'admin.usersDesc': 'Exact mapping of NocoBase permissions. Change each user\'s role — CRUD permissions are applied in real time on the backend.',
  'admin.brandingTitle': 'Customize Appearance',
  'admin.brandingDesc': 'Customize the logo and login screen text',
  'admin.role': 'Role',
  'admin.user': 'User',
  'admin.userEmail': 'Email',
  'admin.crudMatrix': 'Privilege Matrix (CRUD)',
  'admin.crudCreate': 'Create',
  'admin.crudRead': 'Read',
  'admin.crudUpdate': 'Update',
  'admin.crudDelete': 'Delete',
  'admin.crudCollections': 'Collections',
  'admin.crudAll': 'All collections',
  'admin.crudNone': 'No access',
  'admin.crudPartial': 'Specific collections',
  'admin.loadingRoles': 'Loading roles...',
  'admin.loadingPermissions': 'Loading permissions...',
  'admin.noPermissions': 'No permissions configured for this role.',
  'admin.roleUpdated': 'Role updated in NocoBase successfully.',
  'admin.roleUpdateFailed': 'Failed to update role in NocoBase.',
  'admin.syncingRole': 'Syncing...',
  'admin.confirmRoleChange': 'Are you sure you want to change this user\'s role to "{role}"?',
  'security.accessDenied': 'Access Denied',
  'security.accessDeniedDesc': 'You do not have permission to access this project. Your access is restricted to authorized projects only.',
  'security.backToProjects': 'Back to Authorized Projects',
  'security.unauthorizedProject': 'Unauthorized Project',
  'security.unauthorizedDesc': 'The selected project is not in your authorized projects list. Please select a project you have access to.',
  'form.required': 'Required',
  'form.requiredField': 'This field is required',
  'form.searchPlaceholder': 'Search...',
  'form.loadingOptions': 'Loading options...',
  'form.noResults': 'No results found',
  'form.selectOption': 'Select an option',
  'form.validationError': 'Please fill in all required fields.',
  'security.validationFailed': 'Error loading project',
  'security.validationFailedDesc': 'Could not validate access to the project. Please check your permissions.',
  'security.invalidProject': 'Invalid Project',
  'security.invalidProjectDesc': 'The selected project does not have a valid identifier. Please select another project.',
  'reports.title': 'Report Center',
  'reports.subtitle': 'Generate and download custom reports in Excel, Word, and PDF',
  'reports.selectTable': 'Choose Table',
  'reports.selectTableDesc': 'Select the table to extract data from for the report',
  'reports.filters': 'Dynamic Filters',
  'reports.dateFrom': 'Date from',
  'reports.dateTo': 'Date to',
  'reports.filterValue': 'Filter value',
  'reports.filterField': 'Filter field',
  'reports.addFilter': 'Add filter',
  'reports.removeFilter': 'Remove',
  'reports.fields': 'Field Selection',
  'reports.fieldsDesc': 'Choose exactly which columns to include in the report',
  'reports.selectAll': 'Select All',
  'reports.clearSelection': 'Clear Selection',
  'reports.selectedCount': '{n} of {total} fields selected',
  'reports.narrative': 'Report Narrative',
  'reports.narrativeDesc': 'Write an introduction, conclusion, or executive analysis to be included in the document',
  'reports.narrativePlaceholder': 'Write your executive analysis here... This narrative will be inserted at the beginning of the report (Word and PDF).',
  'reports.includeCharts': 'Include Dashboard Charts',
  'reports.chartsDesc': 'Active dashboard charts will be converted to images and inserted into the report',
  'reports.generate': 'Generate Report',
  'reports.generateExcel': 'Excel (.xlsx)',
  'reports.generateWord': 'Word (.docx)',
  'reports.generatePdf': 'PDF (.pdf)',
  'reports.generating': 'Generating {format}, please wait...',
  'reports.noFields': 'No fields available for this table.',
  'reports.noTableSelected': 'Select a table to get started.',
  'reports.loadingFields': 'Loading fields...',
  'reports.loadingData': 'Loading data...',
  'reports.error': 'Error',
  'reports.errorLoadingFields': 'Error loading table fields.',
  'reports.errorLoadingData': 'Error loading data. Check the connection and try again.',
  'reports.success': 'Success',
  'reports.reportGenerated': 'Report generated successfully.',
  'reports.noDataFiltered': 'No records found with the applied filters.',
  'reports.tooManyRecords': 'Too many records',
  'reports.tooManyRecordsDesc': 'The report has more than {n} records. The file may take a while to generate. Continue?',
  'reports.preview': 'Preview',
  'reports.recordsCount': '{n} records',
  'reports.recordsCountSingular': '{n} record',
  'reports.reportTitle': 'Report of {table}',
  'reports.reportDate': 'Generation Date',
  'reports.page': 'Page',
  'reports.preparedBy': 'Prepared by',
  'reports.chartsIncluded': 'Charts included',
  'reports.noChartsAvailable': 'No charts available in the current dashboard.',
};

const dictionaries: Record<Language, Translations> = { pt, en };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyVars(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = vars[key];
    if (val === undefined) return `{${key}}`;
    return String(val);
  });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'pt' || stored === 'en') return stored;
    } catch {
      // storage unavailable
    }
    return 'pt';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // storage unavailable
    }
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const dict = dictionaries[language];
    const template = dict[key] ?? key;
    return applyVars(template, vars);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
