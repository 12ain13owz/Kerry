const NumberOnly = (e) => { e.value = e.value.replace(/[^0-9]/g, '') }

const CheckEmpty = (err, id) => {
    let $this = $('#' + id)

    if ($this.val().length <= 0) {
        err = true
        $this.closest('div').addClass('has-error')
    } else { $this.closest('div').removeClass('has-error') }
    return err
}

const CheckMobile = (err, id) => {
    let $this = $('#' + id)

    if ($this.val().length != 10) {
        err = true
        $this.closest('div').addClass('has-error')
    } else { $this.closest('div').removeClass('has-error') }
    return err
}

const FocusError = () => {
    let $this = $('body').find('.has-error').find('input')[0].id
    $('#' + $this).focus()
}