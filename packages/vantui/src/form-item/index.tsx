import {
  useState,
  useContext,
  cloneElement,
  isValidElement,
  useMemo,
  useEffect,
  useCallback,
} from 'react'
import { View } from '@tarojs/components'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { FormItemProps, IFormInstanceAPI } from '../../types/form'
import FormContext from '../form/core/formContext'
import Label from './label'
import Message from './message'

const prefixCls = 'vant-form-formItem'

export function FormItem(props: FormItemProps) {
  const {
    id,
    name,
    layout = 'horizontal',
    children,
    label,
    required = false,
    rules = {},
    trigger = 'onChange',
    validateTrigger = 'onChange',
    labelClassName = '',
    requiredClassName = '',
    controllClassName = '',
    className = '',
    requiredIcon = '',
    feedback = 'failed',
    valueKey = 'value',
    renderRight,
    mutiLevel,
    valueFormat,
    messageClassName = '',
  } = props
  const formInstance = useContext<IFormInstanceAPI>(FormContext)
  const { registerValidateFields, dispatch, unRegisterValidate } = formInstance
  const [, forceUpdate_] = useState({})
  const _name = Array.isArray(name) ? name.join('.') : name

  const onStoreChange = useMemo(() => {
    const onStoreChange = {
      changeValue() {
        forceUpdate_({})
      },
    }
    return onStoreChange
  }, [])

  useDeepCompareEffect(() => {
    /* 注册表单 */
    _name &&
      registerValidateFields(_name, onStoreChange, {
        rules,
        required,
        label,
        mutiLevel,
      })
  }, [
    _name,
    label,
    mutiLevel,
    onStoreChange,
    registerValidateFields,
    required,
    rules,
    unRegisterValidate,
  ])

  useEffect(function () {
    return function () {
      _name && unRegisterValidate(_name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const innnerValue = dispatch({ type: 'getFieldValue' }, _name)

  const nextHandle = useCallback(
    (value, e, trigger_) => {
      dispatch({ type: 'setFieldsValue' }, _name, value)
      if (trigger_) trigger_(e)
    },
    [_name, dispatch],
  )

  const defaultValueFormat = useCallback((e, _name, _formInstance) => {
    return e.detail
  }, [])

  const getControlled = useCallback(
    (child: any) => {
      const props = { ...child.props }
      if (!_name) return props
      const trigger_ = props[trigger]

      const isWeappInput =
        isValidElement(children) &&
        children?.type === 'input' &&
        process.env.TARO_ENV === 'weapp'

      const valueFormat_ = valueFormat || defaultValueFormat

      const handleChange = (e: any) => {
        const result = valueFormat_(e, _name, formInstance)
        // 兼容注入的Promise
        if (result?.then && result?.catch) {
          if (isWeappInput) {
            console.warn(
              `微信端Input组件请尽量不要异步函数处理，由于FormItem代理的Input会基于微信端做性能优化，
              请查阅https://developers.weixin.qq.com/miniprogram/dev/component/input.html`,
            )
          }
          result.then((v) => {
            nextHandle(v, e, trigger_)
          })
        } else {
          nextHandle(result, e, trigger_)
          if (isWeappInput) {
            // 微信端Input输入存在性能问题，微信2.1版本后基于bindInput返回值做优化
            return result
          }
        }
      }
      props[trigger] = handleChange
      if (required || rules) {
        props[validateTrigger] = async (e: any) => {
          if (validateTrigger === trigger) {
            await handleChange(e)
          }

          dispatch({ type: 'validateFieldValue' }, _name)
        }
      }
      props[valueKey] = innnerValue

      return props
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [innnerValue, _name, trigger, required, rules],
  )

  const renderChildren = useMemo(
    function () {
      return isValidElement(children)
        ? cloneElement(children, getControlled(children))
        : children
    },
    [children, getControlled],
  )

  return (
    <View className={`${prefixCls}-wrapper`}>
      <View
        id={id}
        className={`${prefixCls} ${prefixCls}-${layout} ${className}`}
      >
        <Label
          label={label}
          required={required}
          className={labelClassName}
          requiredClassName={requiredClassName}
          requiredIcon={requiredIcon}
        />
        <View className={`${prefixCls}-controll ${controllClassName}`}>
          <View className={`${prefixCls}-controll-item`}>
            {renderChildren}
            {renderRight}
          </View>
          <Message
            name={label}
            className={messageClassName}
            feedback={feedback}
            {...dispatch({ type: 'getFieldModel' }, _name)}
          />
        </View>
      </View>
    </View>
  )
}

export default FormItem
