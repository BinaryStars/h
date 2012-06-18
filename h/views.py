from functools import partial
import json
import re

from apex import logout
from apex.models import AuthID, AuthUser

from colander import deferred, Invalid, Length, Schema, SchemaNode, String, Email
from deform.form import Form
from deform.widget import FormWidget, PasswordWidget, SelectWidget

from pyramid.httpexceptions import HTTPRedirection, HTTPSeeOther
from pyramid.renderers import get_renderer, render
from pyramid.response import Response
from pyramid.security import forget, remember, NO_PERMISSION_REQUIRED
from pyramid.view import render_view_to_response

from pyramid_deform import CSRFSchema, FormView
from pyramid_webassets import IWebAssetsEnvironment

import api

def login_validator(node, kw):
    valid = False
    if 'username' in kw:
        valid = AuthUser.check_password(
            login=kw['username'],
            password=kw['password']
        )
    if not valid:
        raise Invalid(
            node,
            "Please, try again."
        )

def register_validator(node, kw):
    valid = False
    if 'password' in kw:
        if kw['password'] != kw.get('password2', None):
            raise Invalid(node, "Passwords should match!")

class LoginSchema(CSRFSchema):
    username = SchemaNode(
        String(),
        validator=Length(min=4, max=25),
    )
    password = SchemaNode(
        String(),
        widget=PasswordWidget(),
    )

class RegisterSchema(LoginSchema):
    email = SchemaNode(
        String(),
        validator=Email()
    )
    passord2 = SchemaNode(
        String(),
        title='Password',
        widget=PasswordWidget(),
    )

class PersonaSchema(CSRFSchema):
    persona = SchemaNode(
        String(),
        widget=deferred(
            lambda node, kw: SelectWidget(
                values=api.users(kw['request']) + [(-1, 'Sign out')])
        ),
    )

class FormView(FormView):
    use_ajax = True

    def __init__(self, request, **kwargs):
        super(FormView, self).__init__(request)
        self.form_class = partial(self.form_class, **kwargs)

    def show(self, form):
        if self.request.method == 'POST' and self.request.is_xhr:
            formid = self.request.params.get('__formid__')
            new_request = self.request.copy_get()
            new_request.user = self.request.user
            new_request.registry = self.request.registry
            context = getattr(self.request, 'context', None)
            response = render_view_to_response(context, new_request, formid)
            response.headers.update(self.request.response.headers)
            return response
        else:
            return super(FormView, self).show(form)

class login(FormView):
    schema = LoginSchema(validator=login_validator)
    buttons = ('sign in',)
    use_ajax = False
    form_class = partial(Form, bootstrap_form_style='form-vertical')

    def sign_in_success(self, form):
        user = AuthUser.get_by_login(form['username'])
        headers = {}
        if user:
            headers = remember(self.request, user.auth_id)
            # TODO: Investigate why request.set_property doesn't seem to work
            self.request.user = AuthID.get_by_id(user.auth_id)
        raise HTTPSeeOther(headers=headers, location=self.request.url)

class register(FormView):
    schema = RegisterSchema(validator=register_validator)
    buttons = ('register',)
    use_ajax = False

class persona(FormView):
    schema = PersonaSchema()
    use_ajax = True

def app(request):
    return {}

def embed(request):
    environment = request.registry.queryUtility(IWebAssetsEnvironment)
    return render(
        'templates/embed.pt',
        {
            'd3': json.dumps(environment['d3'].urls()),
            'easyXDM': json.dumps(environment['easyXDM'].urls()),
            'jquery': json.dumps(environment['jquery'].urls()),
            'underscore': json.dumps(environment['underscore'].urls()),
            'hypothesis': json.dumps(
                    environment['annotator'].urls() +
                    environment['handlebars'].urls() +
                    environment['jwz'].urls() +
                    environment['app_js'].urls() +
                    environment['inject_css'].urls()),
            'app_css': json.dumps(environment['app_css'].urls())
        },
        request=request)

class home(object):
    def __init__(self, request):
        self.request = request

    @property
    def partial(self):
        return getattr(self, self.request.params['__formid__'])

    def __call__(self):
        action = self.request.get('action', 'login')
        if self.request.user:
            form = persona(self.request)
        else:
            form = login(self.request, bootstrap_form_style='form-vertical')
        result = form()
        result.update({
            'embed': embed(self.request)
        })
        return result

def includeme(config):
    config.include('deform_bootstrap')
    config.include('pyramid_deform')
    config.include('velruse.app')

    config.add_view(home, renderer='templates/home.pt')
    config.add_view(home, attr='partial', renderer='templates/form.pt', xhr=True)
    config.add_view(home, name='auth', attr='auth', renderer='templates/form.pt')

    config.add_view(app, renderer='templates/sidebar.pt', route_name='app')

    config.add_view(login, renderer='templates/auth.pt',
                    route_name='login')
    config.add_view(logout, route_name='logout')
    config.add_view(register, renderer='templates/auth.pt',
                    route_name='register')

    config.add_view(lambda r: Response(body=embed(r),
                                       cache_control='must-revalidate',
                                       content_type='application/javascript',
                                       charset='utf-8'),
                    route_name='embed')

    config.add_static_view('h/annotator', 'h:annotator')
    config.add_static_view('h/sass', 'h:sass')
    config.add_static_view('h/js', 'h:js')
    config.add_static_view('h/images', 'h:images')
