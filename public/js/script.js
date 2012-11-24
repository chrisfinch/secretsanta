var process = {
	init: function () {
		var _this = this;

		_this.success = Handlebars.compile($("#success").html());
		_this.error = Handlebars.compile($("#error").html());

		_this.$l = $('.loader');
		_this.$f = $('#signup');
		_this.$f.on('submit', function (e) {
			event.preventDefault();
			_this.$l.show();
			if (_this.valid()) {_this.submit();} else {
				_this.doError("Fill out both fields...");
			}
		});
	},

	valid: function () {
		var valid = true;
		this.$f.find('input').each(function () {
			if ($(this).val() === '') {
				valid = false;
			}
		});
		return valid;
	},

	doError: function (msg) {
		var _this = this;
		$("#alert-error").html(_this.error({
			msg: msg
		})).each(function () { // Callback
			_this.$l.hide();
			$("#alert-error").slideDown();
			$("input").on('focus', function () {
				$("#alert-error").slideUp();
			});
		});
	},

	submit: function () {
		var _this = this;
		var p = {
			name: _this.$f.find('.name').val(),
			email: _this.$f.find('.email').val()
		};

		$.get('/reg', p).done(function (data) {
			$("#alert-success").html(_this.success({
				name: data.name,
				email: data.email
			})).each(function () { // Callback
				_this.$l.hide();
				$("#alert-success").slideDown();
			});
		}).fail(function (data) {
			_this.doError(data.responseText);
		});
	}
};

$(function () {
	process.init();
});
